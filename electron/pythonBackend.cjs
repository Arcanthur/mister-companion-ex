const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

let backendProcess = null;
let nextRequestId = 1;
const pending = new Map();
let stdoutBuffer = "";
let lastError = "";
let activePythonCommand = "";

function appRootDir() {
  return path.join(__dirname, "..");
}

function resourceRootDir() {
  return process.resourcesPath || appRootDir();
}

function backendRootDir() {
  const resourceBackend = path.join(resourceRootDir(), "python-backend");
  if (fs.existsSync(path.join(resourceBackend, "main.py"))) return resourceBackend;

  const appBackend = path.join(appRootDir(), "python-backend");
  if (fs.existsSync(path.join(appBackend, "main.py"))) return appBackend;

  return appBackend;
}

function backendScriptPath() {
  return path.join(backendRootDir(), "main.py");
}

function candidatePythonCommands() {
  const envPython = process.env.MISTER_COMPANION_PYTHON || process.env.PYTHON;
  const commands = [];

  if (envPython) commands.push({ label: "MISTER_COMPANION_PYTHON", command: envPython, args: [] });

  const appRoot = appRootDir();
  const localVenvCandidates = [
    path.join(appRoot, ".venv", process.platform === "win32" ? "Scripts" : "bin", process.platform === "win32" ? "python.exe" : "python"),
    path.join(appRoot, "..", ".venv", process.platform === "win32" ? "Scripts" : "bin", process.platform === "win32" ? "python.exe" : "python"),
  ];

  for (const venvPython of localVenvCandidates) {
    if (fs.existsSync(venvPython)) {
      commands.push({ label: "local venv", command: venvPython, args: [] });
    }
  }

  // Prefer the normal PATH python first. The Windows py launcher can return a
  // Store/winget error for a specific version even when a usable `python.exe`
  // is already installed and working in the user's shell.
  commands.push({ label: "python", command: "python", args: [] });
  commands.push({ label: "python3", command: "python3", args: [] });

  if (process.platform === "win32") {
    commands.push({ label: "py -3", command: "py", args: ["-3"] });
    commands.push({ label: "py -3.12", command: "py", args: ["-3.12"] });
    commands.push({ label: "py", command: "py", args: [] });
  }

  const seen = new Set();
  return commands.filter((spec) => {
    const key = `${spec.command}\0${spec.args.join("\0")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function probePythonCommand(commandSpec) {
  const probe = spawnSync(
    commandSpec.command,
    [
      ...commandSpec.args,
      "-c",
      "import sys, json; print(json.dumps({'executable': sys.executable, 'version': sys.version_info[:3]}))",
    ],
    {
      encoding: "utf8",
      timeout: 6000,
      windowsHide: true,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    }
  );

  if (probe.error) {
    return { ok: false, error: probe.error.message };
  }

  if (probe.status !== 0) {
    return {
      ok: false,
      error: String(probe.stderr || probe.stdout || `exit ${probe.status}`).trim(),
    };
  }

  const line = String(probe.stdout || "").trim().split(/\r?\n/).pop() || "";
  try {
    const info = JSON.parse(line);
    const [major, minor] = info.version || [];
    if (Number(major) < 3 || (Number(major) === 3 && Number(minor) < 9)) {
      return { ok: false, error: `Python ${major}.${minor} is too old. Python 3.9+ is required.` };
    }
    return { ok: true, info };
  } catch (error) {
    return { ok: false, error: `Could not parse Python probe output: ${line}` };
  }
}

function rejectAllPending(error) {
  for (const [_id, request] of pending.entries()) {
    clearTimeout(request.timer);
    request.reject(error);
  }
  pending.clear();
}

function trySpawnBackend(commandSpec) {
  const script = backendScriptPath();
  if (!fs.existsSync(script)) {
    throw new Error(`Python backend script was not found: ${script}`);
  }

  const args = [...commandSpec.args, script];
  const child = spawn(commandSpec.command, args, {
    cwd: backendRootDir(),
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      PYTHONUNBUFFERED: "1",
      MISTER_VAULTKIT_BACKEND: "1",
    },
    windowsHide: true,
  });

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdoutBuffer += chunk;
    let newlineIndex;
    while ((newlineIndex = stdoutBuffer.indexOf("\n")) >= 0) {
      const line = stdoutBuffer.slice(0, newlineIndex).trim();
      stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
      if (!line) continue;
      let message;
      try {
        message = JSON.parse(line);
      } catch (error) {
        lastError = `Invalid backend response: ${line}`;
        continue;
      }
      const request = pending.get(message.id);
      if (!request) continue;
      pending.delete(message.id);
      clearTimeout(request.timer);
      if (message.ok === false) {
        const error = new Error(message.error || "Python backend request failed");
        error.details = message.details;
        request.reject(error);
      } else {
        request.resolve(message.result);
      }
    }
  });
  child.stderr.on("data", (chunk) => {
    lastError = String(chunk || "").trim() || lastError;
    if (process.env.DEBUG_MISTER_BACKEND) process.stderr.write(chunk);
  });
  child.on("exit", (code, signal) => {
    backendProcess = null;
    rejectAllPending(new Error(`Python backend exited (${signal || code || 0}). ${lastError || ""}`.trim()));
  });
  child.on("error", (error) => {
    backendProcess = null;
    lastError = error.message;
    rejectAllPending(error);
  });

  activePythonCommand = [commandSpec.command, ...commandSpec.args].join(" ");
  return child;
}

function startBackend() {
  if (backendProcess && !backendProcess.killed) return backendProcess;

  let lastSpawnError = null;
  const probeFailures = [];

  for (const commandSpec of candidatePythonCommands()) {
    const probe = probePythonCommand(commandSpec);
    if (!probe.ok) {
      probeFailures.push(`${commandSpec.label || commandSpec.command}: ${probe.error}`);
      continue;
    }

    try {
      backendProcess = trySpawnBackend(commandSpec);
      activePythonCommand = `${[commandSpec.command, ...commandSpec.args].join(" ")} (${probe.info?.executable || "detected"})`;
      return backendProcess;
    } catch (error) {
      lastSpawnError = error;
      probeFailures.push(`${commandSpec.label || commandSpec.command}: ${error.message}`);
    }
  }

  lastError = [
    "Could not find a usable Python runtime for the MiSTer backend.",
    "Install Python 3.12+ or set MISTER_COMPANION_PYTHON to a working python.exe.",
    ...probeFailures.map((failure) => `- ${failure}`),
  ].join("\n");

  throw lastSpawnError || new Error(lastError);
}

function callBackend(method, params = {}, timeoutMs = 30000) {
  startBackend();
  if (!backendProcess || !backendProcess.stdin.writable) {
    return Promise.reject(new Error("Python backend is not running."));
  }

  const id = nextRequestId++;
  const payload = JSON.stringify({ id, method, params }) + "\n";

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Python backend timed out during ${method}.`));
    }, Math.max(1000, Number(timeoutMs) || 30000));

    pending.set(id, { resolve, reject, timer });
    backendProcess.stdin.write(payload, "utf8", (error) => {
      if (!error) return;
      pending.delete(id);
      clearTimeout(timer);
      reject(error);
    });
  });
}

function backendInfo() {
  return {
    running: Boolean(backendProcess && !backendProcess.killed),
    pythonCommand: activePythonCommand,
    script: backendScriptPath(),
    lastError,
  };
}

function stopBackend() {
  if (!backendProcess) return;
  try {
    backendProcess.kill();
  } catch {}
  backendProcess = null;
}

module.exports = {
  callBackend,
  backendInfo,
  startBackend,
  stopBackend,
};
