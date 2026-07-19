const { app, BrowserWindow, shell, ipcMain, dialog, clipboard, protocol, net, session, screen } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");
const http = require("node:http");
const https = require("node:https");
const packageMetadata = require("../package.json");
const appManifest = require("./config/app-manifest.cjs");
const { callBackend, backendInfo, startBackend, stopBackend } = require("./pythonBackend.cjs");
const APP_USER_MODEL_ID = appManifest.appUserModelId;
const activeWindowMoves = new WeakMap();
const lastWindowMaximizeToggle = new WeakMap();
const freelyResizableWindows = new WeakSet();
const DEFAULT_VISIBLE_WINDOW_WIDTH = 1600;
const DEFAULT_VISIBLE_WINDOW_HEIGHT = 1000;
const PLATINUM_SMALL_VISIBLE_WINDOW_WIDTH = 1300;
const PLATINUM_SMALL_VISIBLE_WINDOW_HEIGHT = 900;
const FIXED_WINDOW_SHADOW_GUTTER = 48;
const FIXED_WINDOW_SCREEN_MARGIN = 48;

function fixedNormalWindowSize(smallerWindow = false, display = null) {
  const visibleWidth = smallerWindow ? PLATINUM_SMALL_VISIBLE_WINDOW_WIDTH : DEFAULT_VISIBLE_WINDOW_WIDTH;
  const visibleHeight = smallerWindow ? PLATINUM_SMALL_VISIBLE_WINDOW_HEIGHT : DEFAULT_VISIBLE_WINDOW_HEIGHT;
  const requestedWidth = visibleWidth + (FIXED_WINDOW_SHADOW_GUTTER * 2);
  const requestedHeight = visibleHeight + (FIXED_WINDOW_SHADOW_GUTTER * 2);
  try {
    const targetDisplay = display || screen.getPrimaryDisplay();
    const { width, height } = targetDisplay?.workAreaSize || targetDisplay?.workArea || {};
    return {
      width: Math.min(requestedWidth, Math.max(1180, Number(width || requestedWidth) - FIXED_WINDOW_SCREEN_MARGIN)),
      height: Math.min(requestedHeight, Math.max(720, Number(height || requestedHeight) - FIXED_WINDOW_SCREEN_MARGIN)),
      visibleWidth,
      visibleHeight,
    };
  } catch {
    return { width: requestedWidth, height: requestedHeight, visibleWidth, visibleHeight };
  }
}

function applyFixedWindowSize(win, smallerWindow = false) {
  if (!win || win.isDestroyed()) return null;
  const currentBounds = win.getBounds();
  let display = null;
  try { display = screen.getDisplayMatching(currentBounds); } catch {}
  const size = fixedNormalWindowSize(smallerWindow, display);
  const workArea = display?.workArea || { x: currentBounds.x, y: currentBounds.y, width: size.width, height: size.height };
  const centeredX = currentBounds.x + Math.round((currentBounds.width - size.width) / 2);
  const centeredY = currentBounds.y + Math.round((currentBounds.height - size.height) / 2);
  const maximumX = workArea.x + Math.max(0, workArea.width - size.width);
  const maximumY = workArea.y + Math.max(0, workArea.height - size.height);
  const nextBounds = {
    x: Math.max(workArea.x, Math.min(centeredX, maximumX)),
    y: Math.max(workArea.y, Math.min(centeredY, maximumY)),
    width: size.width,
    height: size.height,
  };
  const wasMaximized = win.isMaximized();
  runWithTemporaryResizeCapability(win, () => {
    if (wasMaximized) win.unmaximize();
    try { win.setMinimumSize(1, 1); } catch {}
    win.setBounds(nextBounds, false);
    try { win.setMinimumSize(size.width, size.height); } catch {}
    if (wasMaximized) win.maximize();
  });
  return size;
}

function lockManualResize(win) {
  if (!win || win.isDestroyed() || freelyResizableWindows.has(win)) return;
  try { win.setResizable(false); } catch {}
}

function runWithTemporaryResizeCapability(win, action) {
  if (!win || win.isDestroyed()) return;
  const keepResizable = freelyResizableWindows.has(win);
  try { win.setResizable(true); } catch {}
  try { action?.(); } finally {
    if (!keepResizable) setTimeout(() => lockManualResize(win), 80);
  }
}

function toggleWindowMaximize(win) {
  if (!win || win.isDestroyed()) return false;
  const now = Date.now();
  if (now - (lastWindowMaximizeToggle.get(win) || 0) < 300) return win.isMaximized();
  lastWindowMaximizeToggle.set(win, now);
  runWithTemporaryResizeCapability(win, () => {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  return win.isMaximized();
}

const isDev = !app.isPackaged;
const legacyUserDataPath = app.getPath("userData");
const portableBasePath = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(app.getPath("exe"));
// Keep Chromium's development profile outside the Vite project tree. Packaged portable
// builds instead place all user-facing folders beside the executable.
const devUserDataBasePath = process.env.MISTER_COMPANION_DEV_DATA
  || path.join(app.getPath("appData"), appManifest.devDataFolder);
const runtimeRootPath = isDev ? devUserDataBasePath : portableBasePath;
const portableUserDataPath = isDev
  ? devUserDataBasePath
  : path.join(runtimeRootPath, appManifest.portableDataFolder);
const portableThemesPath = path.join(runtimeRootPath, appManifest.themesFolder);
const portableFontsPath = path.join(runtimeRootPath, appManifest.fontsFolder);
const portableAssetsPath = path.join(runtimeRootPath, appManifest.assetsFolder);
const portableToolsPath = path.join(runtimeRootPath, appManifest.toolsFolder);
const backendDataPath = path.join(portableUserDataPath, appManifest.backendDataFolder);
const legacyPortableDataPaths = isDev
  ? []
  : (appManifest.legacyPortableDataFolders || []).map((folder) => path.join(runtimeRootPath, folder));

// Rename the old portable folder before Electron opens its Chromium profile. This
// avoids splitting locked profile files between the legacy and new locations.
if (!isDev && !fsSync.existsSync(portableUserDataPath)) {
  for (const legacyPath of legacyPortableDataPaths) {
    if (!fsSync.existsSync(legacyPath)) continue;
    try {
      fsSync.renameSync(legacyPath, portableUserDataPath);
      break;
    } catch {}
  }
}
app.setPath("userData", portableUserDataPath);
app.setAppUserModelId(APP_USER_MODEL_ID);
const LDDB_PARTITION = appManifest.lddbPartition;
let lddbSessionWindow = null;
let searchWindow = null;
let trailerPlayerServer = null;
let trailerPlayerOrigin = "";
let splashWindow = null;
let mainWindow = null;
let rendererReadyTimer = null;
let youtubeLoginWindow = null;
let themePreviewWindow = null;
let themePreviewTheme = null;
let startupLogPath = null;
const manualFileTokens = new Map();

function ensureStartupLogPath() {
  if (startupLogPath) return startupLogPath;
  try {
    const directory = app.getPath("userData");
    fsSync.mkdirSync(directory, { recursive: true });
    startupLogPath = path.join(directory, "startup.log");
  } catch {
    startupLogPath = path.join(process.cwd(), "mister-companion-vaultkit-startup.log");
  }
  return startupLogPath;
}

function logStartup(message, details = "") {
  const line = `[${new Date().toISOString()}] ${message}${details ? `\n${details}` : ""}\n`;
  try { fsSync.appendFileSync(ensureStartupLogPath(), line, "utf8"); } catch {}
  try { console.log(message, details || ""); } catch {}
}

function diagnosticHtml(title, message, details = "") {
  const esc = (value) => String(value || "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{height:100%;margin:0;background:#10131a;color:#e8edf3;font-family:Inter,Segoe UI,sans-serif}
    body{display:grid;place-items:center;padding:32px}
    main{max-width:880px;width:min(880px,92vw);border:1px solid #38424e;border-radius:18px;background:#171c24;padding:28px;box-shadow:0 24px 80px rgba(0,0,0,.45)}
    h1{margin:0 0 8px;font-size:24px}p{color:#aab4c0;line-height:1.5}pre{white-space:pre-wrap;max-height:420px;overflow:auto;background:#0b0e13;border:1px solid #303945;border-radius:12px;padding:16px;color:#dbe5ee}
  </style></head><body><main><h1>${esc(title)}</h1><p>${esc(message)}</p><pre>${esc(details || "No extra details were reported.")}</pre><p>Startup log: ${esc(ensureStartupLogPath())}</p></main></body></html>`;
}

function showDiagnosticInMainWindow(title, message, details = "") {
  logStartup(`${title}: ${message}`, details);
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    mainWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(diagnosticHtml(title, message, details)));
    mainWindow.setBackgroundColor("#10131a");
    mainWindow.show();
    mainWindow.focus();
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
  } catch {}
}

function showFatalStartupError(error) {
  const message = error?.stack || error?.message || String(error || "Unknown startup error");
  console.error(message);
  logStartup("Fatal startup error", message);
  try {
    dialog.showErrorBox(`${appManifest.productName || appManifest.windowTitle} failed to start`, message);
  } catch {}
}

process.on("uncaughtException", (error) => {
  showFatalStartupError(error);
  app.quit();
});

process.on("unhandledRejection", (reason) => {
  showFatalStartupError(reason instanceof Error ? reason : new Error(String(reason)));
});

protocol.registerSchemesAsPrivileged([{
  scheme: appManifest.mediaScheme,
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
}]);

async function pathExists(value) {
  try {
    await fs.access(value);
    return true;
  } catch {
    return false;
  }
}

async function mergeLegacyDirectory(sourcePath, destinationPath, { removeSource = true } = {}) {
  if (!sourcePath || !destinationPath || path.resolve(sourcePath) === path.resolve(destinationPath)) return false;
  if (!(await pathExists(sourcePath))) return false;

  await fs.mkdir(destinationPath, { recursive: true });
  const entries = await fs.readdir(sourcePath, { withFileTypes: true });
  for (const entry of entries) {
    const sourceEntry = path.join(sourcePath, entry.name);
    const destinationEntry = path.join(destinationPath, entry.name);
    if (!(await pathExists(destinationEntry))) {
      if (removeSource) {
        try {
          await fs.rename(sourceEntry, destinationEntry);
          continue;
        } catch {}
      }
      await fs.cp(sourceEntry, destinationEntry, { recursive: entry.isDirectory(), force: false, errorOnExist: false });
      if (removeSource) await fs.rm(sourceEntry, { recursive: entry.isDirectory(), force: true });
      continue;
    }
    if (entry.isDirectory()) {
      await mergeLegacyDirectory(sourceEntry, destinationEntry, { removeSource });
    }
  }

  if (removeSource) {
    try { await fs.rmdir(sourcePath); } catch {}
  }
  return true;
}

async function fileSha256(filePath) {
  const contents = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(contents).digest("hex");
}

async function collectRelativeFiles(rootPath, currentPath = rootPath) {
  if (!(await pathExists(currentPath))) return [];
  const entries = await fs.readdir(currentPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(currentPath, entry.name);
    if (entry.isDirectory()) files.push(...await collectRelativeFiles(rootPath, entryPath));
    else if (entry.isFile()) files.push(path.relative(rootPath, entryPath).replace(/\\/g, "/"));
  }
  return files.sort((left, right) => left.localeCompare(right));
}

async function syncDefaultThemeAssets(sourcePath, destinationPath) {
  if (!(await pathExists(sourcePath))) return { copied: 0, updated: 0, preserved: 0 };
  await fs.mkdir(destinationPath, { recursive: true });
  const manifestPath = path.join(destinationPath, ".mister-companion-default-assets.json");
  let previousFiles = {};
  try {
    const parsed = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    if (parsed?.files && typeof parsed.files === "object" && !Array.isArray(parsed.files)) previousFiles = parsed.files;
  } catch {}

  const nextFiles = {};
  let copied = 0;
  let updated = 0;
  let preserved = 0;
  for (const relativePath of await collectRelativeFiles(sourcePath)) {
    const sourceFile = path.join(sourcePath, ...relativePath.split("/"));
    const destinationFile = path.join(destinationPath, ...relativePath.split("/"));
    const sourceHash = await fileSha256(sourceFile);
    nextFiles[relativePath] = sourceHash;
    if (!(await pathExists(destinationFile))) {
      await fs.mkdir(path.dirname(destinationFile), { recursive: true });
      await fs.copyFile(sourceFile, destinationFile);
      copied += 1;
      continue;
    }
    const destinationHash = await fileSha256(destinationFile);
    if (destinationHash === sourceHash) continue;
    if (previousFiles[relativePath] && destinationHash === previousFiles[relativePath]) {
      await fs.copyFile(sourceFile, destinationFile);
      updated += 1;
    } else {
      preserved += 1;
    }
  }

  await fs.writeFile(manifestPath, JSON.stringify({ schemaVersion: 1, files: nextFiles }, null, 2), "utf8");
  return { copied, updated, preserved };
}

async function migrateLegacyStorageLayout() {
  // Fold the former long portable-data folder into the concise Data directory.
  for (const legacyPath of legacyPortableDataPaths) {
    await mergeLegacyDirectory(legacyPath, portableUserDataPath);
  }

  // Preserve the original AppData migration path for users coming from installed/dev builds.
  if (legacyUserDataPath && legacyUserDataPath !== portableUserDataPath) {
    await mergeLegacyDirectory(legacyUserDataPath, portableUserDataPath, { removeSource: false });
  }

  // Writable Python state now lives at Data/Backend.
  for (const folder of appManifest.legacyBackendDataFolders || []) {
    await mergeLegacyDirectory(path.join(portableUserDataPath, folder), backendDataPath);
  }

  // User-editable libraries live beside the executable so they are easy to browse,
  // back up, and carry between portable releases.
  await mergeLegacyDirectory(path.join(portableUserDataPath, "themes"), portableThemesPath);
  await mergeLegacyDirectory(path.join(portableUserDataPath, "Themes"), portableThemesPath);
  await mergeLegacyDirectory(path.join(portableUserDataPath, "fonts"), portableFontsPath);
  await mergeLegacyDirectory(path.join(portableUserDataPath, "Fonts"), portableFontsPath);
  await mergeLegacyDirectory(path.join(portableUserDataPath, "assets"), portableAssetsPath);
  await mergeLegacyDirectory(path.join(portableUserDataPath, "Assets"), portableAssetsPath);

  // Flash utilities must survive the portable app's temporary extraction directory.
  const legacyToolPaths = [
    path.join(portableUserDataPath, "tools"),
    path.join(portableUserDataPath, "Tools"),
    path.join(backendDataPath, "tools"),
    path.join(backendDataPath, "Tools"),
    ...(!isDev ? [path.join(runtimeRootPath, "tools")] : []),
  ];
  for (const legacyPath of legacyToolPaths) {
    await mergeLegacyDirectory(legacyPath, portableToolsPath);
  }

  await Promise.all([
    fs.mkdir(portableUserDataPath, { recursive: true }),
    fs.mkdir(backendDataPath, { recursive: true }),
    fs.mkdir(portableThemesPath, { recursive: true }),
    fs.mkdir(portableFontsPath, { recursive: true }),
    fs.mkdir(portableAssetsPath, { recursive: true }),
    fs.mkdir(portableToolsPath, { recursive: true }),
  ]);

  // Seed only missing theme assets. Existing files are deliberately preserved so
  // user replacements survive app upgrades while newly introduced assets appear.
  const packagedAssetsPath = isDev
    ? path.join(__dirname, "..", "src", "assets", "mister")
    : path.join(process.resourcesPath, appManifest.packagedThemeAssetsFolder);
  const assetSync = await syncDefaultThemeAssets(packagedAssetsPath, portableAssetsPath);
  logStartup("Theme asset library synchronized", JSON.stringify(assetSync));

  const libraryGuides = [
    [path.join(portableFontsPath, "README.txt"), [
      "MiSTer Companion EX Font Library",
      "",
      "Drop any number of .ttf, .otf, .woff, or .woff2 files into this folder.",
      "Open Settings > Fonts and choose Reload fonts after adding or removing files.",
      "Keep a font filename unchanged when sharing themes that use it.",
    ].join("\r\n")],
    [path.join(portableAssetsPath, "README.txt"), [
      "MiSTer Companion EX Theme Assets",
      "",
      "Replace images in this folder to customize theme artwork.",
      "Keep filenames, dimensions, and folder locations unchanged for reliable results.",
      "Use Settings > Appearance > Reload assets after editing files.",
      "App upgrades add missing stock files but never overwrite existing replacements.",
    ].join("\r\n")],
  ];
  for (const [guidePath, contents] of libraryGuides) {
    try { await fs.writeFile(guidePath, contents, { encoding: "utf8", flag: "wx" }); } catch {}
  }
}

async function startTrailerPlayerServer() {
  if (trailerPlayerServer) return;
  await new Promise((resolve, reject) => {
    trailerPlayerServer = http.createServer((request, response) => {
      const requestUrl = new URL(request.url, "http://127.0.0.1");
      const match = requestUrl.pathname.match(/^\/youtube\/([a-zA-Z0-9_-]{6,32})$/);
      if (!match) {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }

      const videoId = match[1];
      const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0&playsinline=1&origin=${encodeURIComponent(trailerPlayerOrigin)}`;
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "referrer-policy": "strict-origin-when-cross-origin",
        "content-security-policy": "default-src 'none'; frame-src https://www.youtube.com https://www.youtube-nocookie.com; style-src 'unsafe-inline'",
      });
      response.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="strict-origin-when-cross-origin"><style>html,body,iframe{width:100%;height:100%;margin:0;border:0;background:#000;overflow:hidden}</style></head><body><iframe src="${embedUrl}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe></body></html>`);
    });
    trailerPlayerServer.once("error", reject);
    trailerPlayerServer.listen(0, "127.0.0.1", () => {
      const address = trailerPlayerServer.address();
      trailerPlayerOrigin = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
}

function absolutizeUrl(value, base) {
  try { return new URL(value, base).href; } catch { return null; }
}

function htmlDecode(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": appManifest.userAgentName + " personal cover lookup",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error("LDDB " + res.status);
  return await res.text();
}

function isLddbCoverImage(url) {
  const lower = url.toLowerCase();
  return lower.includes("lddb.com/cover/ld/") && /\.(jpe?g|png|webp)(\?|$)/.test(lower);
}

function scoreImage(url) {
  const lower = url.toLowerCase();
  if (!isLddbCoverImage(url)) return -100;
  let score = 20;
  if (lower.includes("front")) score += 4;
  if (lower.includes("large") || lower.includes("big")) score += 2;
  return score;
}

function extractImages(html, baseUrl) {
  const found = [];
  const metaRegex = /<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(metaRegex)) {
    const url = absolutizeUrl(htmlDecode(match[1]), baseUrl);
    if (url) found.push(url);
  }
  const imgRegex = /<img\b[^>]*?src=["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(imgRegex)) {
    const url = absolutizeUrl(htmlDecode(match[1]), baseUrl);
    if (url) found.push(url);
  }
  const hrefRegex = /<a\b[^>]*?href=["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(hrefRegex)) {
    const url = absolutizeUrl(htmlDecode(match[1]), baseUrl);
    if (url) found.push(url);
  }
  return [...new Set(found)].filter(isLddbCoverImage).sort((a, b) => scoreImage(b) - scoreImage(a));
}

function extractCandidatePages(html, baseUrl) {
  const links = [];
  const linkRegex = /<a\b[^>]*?href=["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(linkRegex)) {
    const url = absolutizeUrl(htmlDecode(match[1]), baseUrl);
    if (!url) continue;
    const lower = url.toLowerCase();
    if (lower.includes("lddb.com") && (lower.includes("laserdisc") || lower.includes("view") || lower.includes("film") || lower.includes("search"))) links.push(url);
  }
  return [...new Set(links)].slice(0, 5);
}


function requestBuffer(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    let parsed;
    try { parsed = new URL(url); } catch { reject(new Error("Invalid URL")); return; }
    const client = parsed.protocol === "http:" ? http : https;
    const request = client.request(parsed, {
      method: "GET",
      headers: {
        "user-agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) ${appManifest.userAgentName}`,
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        referer: "https://www.lddb.com/",
      },
    }, (response) => {
      const location = response.headers.location;
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && location && redirects < 5) {
        response.resume();
        const nextUrl = new URL(location, parsed).href;
        requestBuffer(nextUrl, redirects + 1).then(resolve, reject);
        return;
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        reject(new Error("Image " + response.statusCode));
        return;
      }
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({ buffer: Buffer.concat(chunks), contentType: response.headers["content-type"] || "image/jpeg" }));
    });
    request.on("error", reject);
    request.setTimeout(30000, () => request.destroy(new Error("Image request timed out")));
    request.end();
  });
}


function looksLikeHtml(buffer) {
  const text = buffer.slice(0, 512).toString("utf8").trim().toLowerCase();
  return text.startsWith("<!doctype html") || text.startsWith("<html") || text.includes("making sure you") || text.includes("not a bot");
}

function sniffImageMime(buffer, contentType, url) {
  const cleanType = String(contentType || "").split(";")[0].toLowerCase();
  if (cleanType.startsWith("image/")) return cleanType;
  if (buffer?.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer?.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "image/png";
  if (buffer?.length >= 12 && buffer.slice(0, 4).toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return cleanType;
}

function dataUrlToBuffer(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.*)$/);
  if (!match) throw new Error("Browser session did not return image data");
  return { mimeType: match[1], buffer: Buffer.from(match[2], "base64") };
}

async function browserSessionText(url) {
  const win = new BrowserWindow({
    show: false,
    width: 800,
    height: 600,
    webPreferences: { partition: LDDB_PARTITION, contextIsolation: true, nodeIntegration: false },
  });
  try {
    await win.loadURL("https://www.lddb.com/");
    const script = "(async()=>{" +
      "const response=await fetch(" + JSON.stringify(url) + ",{credentials:\"include\",headers:{accept:\"text/html,application/xhtml+xml\"}});" +
      "if(!response.ok)throw new Error(\"LDDB \"+response.status);" +
      "return await response.text();" +
      "})()";
    return await win.webContents.executeJavaScript(script, true);
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}

async function browserSessionImageToDataUrl(url) {
  const win = new BrowserWindow({
    show: false,
    width: 800,
    height: 600,
    webPreferences: { partition: LDDB_PARTITION, contextIsolation: true, nodeIntegration: false },
  });
  try {
    await win.loadURL("https://www.lddb.com/");
    const script = "(async()=>{" +
      "const response=await fetch(" + JSON.stringify(url) + ",{credentials:\"include\"});" +
      "if(!response.ok)throw new Error(\"Image \"+response.status);" +
      "const blob=await response.blob();" +
      "if(!blob.type||!blob.type.startsWith(\"image/\")){const text=await blob.text().catch(()=>\"\");throw new Error(text.toLowerCase().includes(\"not a bot\")?\"LDDB returned an anti-bot page in the browser session\":\"URL did not return an image\");}" +
      "return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});" +
      "})()";
    return await win.webContents.executeJavaScript(script, true);
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}

async function saveDataUrlToScan(dataUrl, sourceUrl) {
  const { mimeType, buffer } = dataUrlToBuffer(dataUrl);
  const scanDir = path.join(app.getPath("userData"), "scan");
  await fs.mkdir(scanDir, { recursive: true });
  const parsed = new URL(sourceUrl);
  const baseName = safeFileName(path.basename(parsed.pathname, path.extname(parsed.pathname)) || "cover");
  const fileName = baseName + "-" + Date.now() + "." + extensionFromContentType(mimeType, sourceUrl);
  const filePath = path.join(scanDir, fileName);
  await fs.writeFile(filePath, buffer);
  return { filePath, mimeType, dataUrl, sourceUrl };
}
function extensionFromContentType(contentType, url) {
  const cleanUrl = String(url || "").split("?")[0].toLowerCase();
  if (contentType.includes("png") || cleanUrl.endsWith(".png")) return "png";
  if (contentType.includes("webp") || cleanUrl.endsWith(".webp")) return "webp";
  if (contentType.includes("gif") || cleanUrl.endsWith(".gif")) return "gif";
  return "jpg";
}

function safeFileName(value) {
  return String(value || "cover").replace(/[^a-z0-9._-]+/gi, "-").replace(/^-|-$/g, "").slice(0, 90) || "cover";
}

async function downloadImageToScan(url) {
  try {
    const { buffer, contentType } = await requestBuffer(url);
    if (looksLikeHtml(buffer)) throw new Error("LDDB returned an anti-bot page instead of the image.");
    const mimeType = sniffImageMime(buffer, contentType, url);
    if (!mimeType || !mimeType.startsWith("image/")) throw new Error("URL did not return image bytes. Content-Type was " + (contentType || "unknown"));
    const scanDir = path.join(app.getPath("userData"), "scan");
    await fs.mkdir(scanDir, { recursive: true });
    const parsed = new URL(url);
    const baseName = safeFileName(path.basename(parsed.pathname, path.extname(parsed.pathname)) || "cover");
    const fileName = baseName + "-" + Date.now() + "." + extensionFromContentType(mimeType, url);
    const filePath = path.join(scanDir, fileName);
    await fs.writeFile(filePath, buffer);
    return { filePath, mimeType, sourceUrl: url, dataUrl: "data:" + mimeType + ";base64," + buffer.toString("base64") };
  } catch (directError) {
    const dataUrl = await browserSessionImageToDataUrl(url);
    return await saveDataUrlToScan(dataUrl, url);
  }
}
async function imageToDataUrl(url) {
  const result = await downloadImageToScan(url);
  return result.dataUrl;
}

async function tryFindCoverForQuery(query, useSession = false) {
  const searchUrl = "https://www.lddb.com/search.php?search=" + encodeURIComponent(query);
  const readText = useSession ? browserSessionText : fetchText;
  const searchHtml = await readText(searchUrl);
  const pages = [searchUrl, ...extractCandidatePages(searchHtml, searchUrl)];
  let best = extractImages(searchHtml, searchUrl)[0] || null;
  for (const pageUrl of pages.slice(1)) {
    if (best && scoreImage(best) >= 8) break;
    try {
      const pageHtml = await readText(pageUrl);
      const image = extractImages(pageHtml, pageUrl)[0] || null;
      if (image && (!best || scoreImage(image) > scoreImage(best))) best = image;
    } catch {}
  }
  if (!best) return null;
  return { sourceUrl: best, dataUrl: useSession ? await browserSessionImageToDataUrl(best) : await imageToDataUrl(best) };
}

async function collectImagesFromFolder(folderPath) {
  const allowed = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
  const found = [];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && allowed.has(path.extname(entry.name).toLowerCase())) {
        const buffer = await fs.readFile(fullPath);
        const mimeType = sniffImageMime(buffer, "", fullPath) || "image/jpeg";
        found.push({ fileName: entry.name, filePath: fullPath, dataUrl: "data:" + mimeType + ";base64," + buffer.toString("base64") });
      }
    }
  }
  await walk(folderPath);
  return found;
}

async function imageFileToDataUrl(filePath) {
  const buffer = await fs.readFile(filePath);
  const mimeType = sniffImageMime(buffer, "", filePath) || "image/jpeg";
  return { fileName: path.basename(filePath), filePath, dataUrl: "data:" + mimeType + ";base64," + buffer.toString("base64") };
}

async function newestScanImage() {
  const scanDir = path.join(app.getPath("userData"), "scan");
  await fs.mkdir(scanDir, { recursive: true });
  const allowed = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
  const entries = await fs.readdir(scanDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile() || !allowed.has(path.extname(entry.name).toLowerCase())) continue;
    const filePath = path.join(scanDir, entry.name);
    const stat = await fs.stat(filePath);
    files.push({ filePath, mtimeMs: stat.mtimeMs });
  }
  files.sort((a, b) => b.mtimeMs - a.mtimeMs);
  if (!files[0]) throw new Error("No image files found in the scan folder.");
  return await imageFileToDataUrl(files[0].filePath);
}

ipcMain.handle("covers:clipboard-image", async () => {
  const image = clipboard.readImage();
  if (image.isEmpty()) throw new Error("The clipboard does not contain an image.");
  const dataUrl = image.toDataURL();
  const scanDir = path.join(app.getPath("userData"), "scan");
  await fs.mkdir(scanDir, { recursive: true });
  const fileName = "clipboard-" + Date.now() + ".png";
  const filePath = path.join(scanDir, fileName);
  await fs.writeFile(filePath, image.toPNG());
  return { fileName, filePath, dataUrl };
});

ipcMain.handle("covers:newest-scan-image", async () => {
  return await newestScanImage();
});

ipcMain.handle("covers:import-folder", async () => {
  const result = await dialog.showOpenDialog({
    title: `Import ${appManifest.windowTitle} cover folder`,
    properties: ["openDirectory"],
  });
  if (result.canceled || !result.filePaths?.[0]) return [];
  return await collectImagesFromFolder(result.filePaths[0]);
});

ipcMain.handle("covers:open-scan-folder", async () => {
  const scanDir = path.join(app.getPath("userData"), "scan");
  await fs.mkdir(scanDir, { recursive: true });
  await shell.openPath(scanDir);
  return scanDir;
});

function isAllowedSearchUrl(value) {
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) && ["www.lddb.com", "lddb.com", "www.themoviedb.org", "themoviedb.org"].includes(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

ipcMain.handle("browser:open-search", async (_event, url) => {
  const target = String(url || "");
  if (!isAllowedSearchUrl(target)) throw new Error("Unsupported search URL");
  if (!searchWindow || searchWindow.isDestroyed()) {
    searchWindow = new BrowserWindow({
      width: 1180,
      height: 820,
      title: appManifest.searchWindowTitle,
      icon: path.join(__dirname, "..", appManifest.iconPath),
      webPreferences: { contextIsolation: true, nodeIntegration: false },
    });
    searchWindow.removeMenu();
    searchWindow.on("closed", () => { searchWindow = null; });
    searchWindow.webContents.setWindowOpenHandler(({ url: childUrl }) => {
      if (isAllowedSearchUrl(childUrl)) {
        searchWindow.loadURL(childUrl);
      } else {
        shell.openExternal(childUrl);
      }
      return { action: "deny" };
    });
  }
  await searchWindow.loadURL(target);
  searchWindow.focus();
  return true;
});

ipcMain.handle("lddb:open-session", async () => {
  if (lddbSessionWindow && !lddbSessionWindow.isDestroyed()) {
    lddbSessionWindow.focus();
    return true;
  }
  lddbSessionWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    title: appManifest.lddbSessionTitle,
    icon: path.join(__dirname, "..", appManifest.iconPath),
    webPreferences: { partition: LDDB_PARTITION, contextIsolation: true, nodeIntegration: false },
  });
  lddbSessionWindow.removeMenu();
  lddbSessionWindow.on("closed", () => { lddbSessionWindow = null; });
  await lddbSessionWindow.loadURL("https://www.lddb.com/");
  return true;
});
async function findCoverInSearchWindow() {
  if (!searchWindow || searchWindow.isDestroyed()) return null;
  const pageUrl = searchWindow.webContents.getURL() || "https://www.lddb.com/";
  if (!pageUrl.includes("lddb.com")) return null;
  const script = "(() => {" +
    "const values=[];" +
    "document.querySelectorAll('meta[property=\"og:image\"],meta[name=\"og:image\"]').forEach(el=>values.push(el.content));" +
    "document.querySelectorAll('img[src],a[href]').forEach(el=>values.push(el.src||el.href));" +
    "return values.filter(Boolean);" +
    "})()";
  const values = await searchWindow.webContents.executeJavaScript(script, true);
  const images = [...new Set((values || []).map((value) => absolutizeUrl(htmlDecode(value), pageUrl)).filter(Boolean))]
    .filter(isLddbCoverImage)
    .sort((a, b) => scoreImage(b) - scoreImage(a));
  const best = images[0] || null;
  if (!best) return null;
  return { sourceUrl: best, dataUrl: await browserSessionImageToDataUrl(best), query: "open LDDB page" };
}

async function findCoverForDisc(disc, useSession = false) {
  const queries = [disc?.upc, disc?.reference, disc?.id, disc?.title]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  for (const query of [...new Set(queries)]) {
    try {
      const result = await tryFindCoverForQuery(query, useSession);
      if (result) return { ...result, query };
    } catch {}
  }
  if (useSession) {
    try {
      const openPageResult = await findCoverInSearchWindow();
      if (openPageResult) return openPageResult;
    } catch {}
  }
  return null;
}

let libraryWriteChain = Promise.resolve();

function portableLibraryPath() {
  return path.join(app.getPath("userData"), "library.json");
}

function trailerDirectory() {
  return path.join(app.getPath("userData"), "trailers");
}

function fontDirectory() {
  return portableFontsPath;
}

function assetDirectory() {
  return portableAssetsPath;
}

const SUPPORTED_FONT_EXTENSIONS = new Set([".ttf", ".otf", ".woff", ".woff2"]);

function userFontFamily(fileName) {
  const stem = path.parse(fileName).name.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 42) || "Font";
  const digest = crypto.createHash("sha1").update(String(fileName).toLowerCase()).digest("hex").slice(0, 10);
  return `${appManifest.id}UserFont_${stem}_${digest}`;
}

function readFontFiles() {
  const directory = fontDirectory();
  if (!fsSync.existsSync(directory)) return [];
  return fsSync.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && SUPPORTED_FONT_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => ({
      name: path.parse(entry.name).name,
      family: userFontFamily(entry.name),
      fileName: entry.name,
      url: `${appManifest.mediaScheme}://font/${encodeURIComponent(entry.name)}`,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));
}

function safeAssetRelativePath(value) {
  const decoded = String(value || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const normalized = path.posix.normalize(decoded);
  if (!normalized || normalized === "." || normalized.startsWith("../") || normalized.includes("/../")) return "";
  return normalized.split("/").map((part) => part.replace(/[^a-zA-Z0-9._ -]/g, "_")).filter(Boolean).join("/");
}

function themeDirectory() {
  return portableThemesPath;
}

function safeThemeFileName(value) {
  const clean = String(value || "").trim().replace(/[^a-zA-Z0-9 _.-]/g, "_").replace(/\s+/g, " ").slice(0, 80);
  return (clean || `${appManifest.windowTitle} Theme`) + ".json";
}

function themeRecordsFromFile(parsed, fallbackName = "Theme") {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
  if (parsed.type === "mister-companion-vaultkit-theme-state") return [];
  if (Array.isArray(parsed.savedThemes)) return uniqueThemeRecords(parsed.savedThemes);
  const theme = safeThemeObject(parsed.theme) || safeThemeObject(parsed.activeTheme) || safeThemeObject(parsed);
  if (!theme) return [];
  const name = String(parsed.name || fallbackName).trim() || "Theme";
  return [{ name, theme }];
}

function readThemeFiles() {
  const directory = themeDirectory();
  if (!fsSync.existsSync(directory)) return [];
  const records = [];
  for (const entry of fsSync.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".json")) continue;
    if (entry.name.toLowerCase() === "theme-state.json") continue;
    try {
      const parsed = JSON.parse(fsSync.readFileSync(path.join(directory, entry.name), "utf8"));
      records.push(...themeRecordsFromFile(parsed, path.parse(entry.name).name.replace(/\.theme$/i, "")));
    } catch {}
  }
  return uniqueThemeRecords(records);
}

function writeThemeFileSync(record) {
  const safe = safeThemeRecord(record);
  if (!safe) return null;
  const directory = themeDirectory();
  fsSync.mkdirSync(directory, { recursive: true });
  const fileName = safeThemeFileName(safe.name);
  fsSync.writeFileSync(path.join(directory, fileName), JSON.stringify({
    schemaVersion: 1,
    type: "mister-companion-vaultkit-theme",
    name: safe.name,
    theme: safe.theme,
  }, null, 2), "utf8");
  return fileName;
}

function migrateStateThemesToFiles(savedState) {
  const records = uniqueThemeRecords(Array.isArray(savedState?.savedThemes) ? savedState.savedThemes : []);
  if (!records.length) return;
  for (const record of records) {
    try { writeThemeFileSync(record); } catch {}
  }
}

function themeStatePath() {
  return path.join(themeDirectory(), "theme-state.json");
}

function safeThemeRecord(value) {
  const name = String(value?.name || "").trim();
  const theme = value?.theme;
  if (!name || !theme || typeof theme !== "object" || Array.isArray(theme)) return null;
  return { name, theme };
}

function uniqueThemeRecords(records = []) {
  const byName = new Map();
  for (const record of records) {
    const safe = safeThemeRecord(record);
    if (safe) byName.set(safe.name, safe);
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function safeThemeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function safeThemeGlyphMap(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function readThemeState() {
  let savedState = {};
  const filePath = themeStatePath();
  try {
    if (fsSync.existsSync(filePath)) {
      savedState = JSON.parse(fsSync.readFileSync(filePath, "utf8")) || {};
    }
  } catch {
    savedState = {};
  }
  const activeTheme = safeThemeObject(savedState.activeTheme || savedState.theme);
  const savedThemes = readThemeFiles();
  return {
    schemaVersion: 2,
    type: "mister-companion-vaultkit-theme-state",
    appId: appManifest.id,
    appName: appManifest.windowTitle,
    dataDirectory: app.getPath("userData"),
    themesDirectory: themeDirectory(),
    themeStateFile: filePath,
    activeTheme,
    savedThemes,
    sidebarGlyphs: safeThemeGlyphMap(savedState.sidebarGlyphs),
    updatedAt: savedState.updatedAt || null,
  };
}

async function writeThemeState(value = {}) {
  const activeTheme = safeThemeObject(value.activeTheme || value.theme);
  const sidebarGlyphs = safeThemeGlyphMap(value.sidebarGlyphs);
  const payload = {
    schemaVersion: 3,
    type: "mister-companion-vaultkit-theme-state",
    appId: appManifest.id,
    appName: appManifest.windowTitle,
    updatedAt: new Date().toISOString(),
    activeTheme,
    sidebarGlyphs,
  };
  await fs.mkdir(themeDirectory(), { recursive: true });
  const temporaryPath = themeStatePath() + ".tmp";
  await fs.writeFile(temporaryPath, JSON.stringify(payload, null, 2), "utf8");
  try {
    await fs.rename(temporaryPath, themeStatePath());
  } catch {
    await fs.rm(themeStatePath(), { force: true });
    await fs.rename(temporaryPath, themeStatePath());
  }
  return readThemeState();
}

function buildThemeBundle(value = {}) {
  const savedThemes = uniqueThemeRecords(Array.isArray(value.savedThemes) ? value.savedThemes : []);
  return {
    schemaVersion: 2,
    type: "mister-companion-vaultkit-theme-bundle",
    appId: appManifest.id,
    appName: appManifest.windowTitle,
    exportedAt: new Date().toISOString(),
    activeTheme: safeThemeObject(value.activeTheme || value.theme),
    savedThemes,
    sidebarGlyphs: safeThemeGlyphMap(value.sidebarGlyphs),
  };
}

function parseImportedThemeBundle(parsed, fallbackName = "Imported Theme") {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("This file does not contain a valid VaultKit theme.");
  if (parsed.type === "mister-companion-vaultkit-theme-bundle" || parsed.activeTheme || parsed.savedThemes || parsed.sidebarGlyphs) {
    const activeTheme = safeThemeObject(parsed.activeTheme || parsed.theme);
    const savedThemes = uniqueThemeRecords(Array.isArray(parsed.savedThemes) ? parsed.savedThemes : []);
    const sidebarGlyphs = safeThemeGlyphMap(parsed.sidebarGlyphs);
    if (!activeTheme && !savedThemes.length && !Object.keys(sidebarGlyphs).length) throw new Error("This theme bundle is empty.");
    return { activeTheme, savedThemes, sidebarGlyphs };
  }
  const singleTheme = safeThemeObject(parsed.theme) || safeThemeObject(parsed);
  if (!singleTheme) throw new Error("This file does not contain a valid VaultKit theme.");
  const name = String(parsed.name || fallbackName).trim() || "Imported Theme";
  return { activeTheme: singleTheme, savedThemes: [{ name, theme: singleTheme }], sidebarGlyphs: {} };
}

function safeTrailerFileName(value) {
  return path.basename(String(value || "")).replace(/[^a-zA-Z0-9._-]/g, "_");
}

function safeFontFileName(value) {
  return path.basename(String(value || "")).replace(/[^a-zA-Z0-9._-]/g, "_");
}

ipcMain.on("library:load", (event) => {
  try {
    const filePath = portableLibraryPath();
    event.returnValue = fsSync.existsSync(filePath) ? fsSync.readFileSync(filePath, "utf8") : null;
  } catch {
    event.returnValue = null;
  }
});

ipcMain.handle("library:save", async (_event, serializedLibrary) => {
  const value = String(serializedLibrary || "");
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed?.discs)) throw new Error("Invalid library data");
  libraryWriteChain = libraryWriteChain.catch(() => {}).then(async () => {
    await fs.mkdir(app.getPath("userData"), { recursive: true });
    const filePath = portableLibraryPath();
    const temporaryPath = filePath + ".tmp";
    await fs.writeFile(temporaryPath, value, "utf8");
    try {
      await fs.rename(temporaryPath, filePath);
    } catch {
      await fs.rm(filePath, { force: true });
      await fs.rename(temporaryPath, filePath);
    }
  });
  await libraryWriteChain;
  return true;
});

ipcMain.handle("library:clear", async () => {
  await fs.rm(portableLibraryPath(), { force: true });
  return true;
});

ipcMain.handle("library:info", async () => {
  const libraryFile = portableLibraryPath();
  let sizeBytes = 0;
  try {
    sizeBytes = (await fs.stat(libraryFile)).size;
  } catch {}
  return {
    storageLabel: isDev ? "Development application data" : "Portable application data",
    dataDirectory: app.getPath("userData"),
    libraryFile,
    sizeBytes,
  };
});

ipcMain.on("themes:list", (event) => {
  event.returnValue = readThemeFiles();
});

ipcMain.on("themes:state-load", (event) => {
  try {
    event.returnValue = readThemeState();
  } catch {
    event.returnValue = { activeTheme: null, savedThemes: [], sidebarGlyphs: {} };
  }
});

ipcMain.handle("themes:state-save", async (_event, value) => {
  return await writeThemeState(value || {});
});

ipcMain.handle("themes:save", async (_event, value) => {
  const name = String(value?.name || "").trim();
  const theme = value?.theme;
  if (!name || !theme || typeof theme !== "object" || Array.isArray(theme)) throw new Error("Invalid theme");
  await fs.mkdir(themeDirectory(), { recursive: true });
  const fileName = safeThemeFileName(name);
  await fs.writeFile(path.join(themeDirectory(), fileName), JSON.stringify({
    schemaVersion: 1,
    type: "mister-companion-vaultkit-theme",
    name,
    theme,
  }, null, 2), "utf8");
  return { name, theme, fileName, themesDirectory: themeDirectory() };
});

ipcMain.handle("themes:open-folder", async () => {
  await fs.mkdir(themeDirectory(), { recursive: true });
  const result = await shell.openPath(themeDirectory());
  if (result) throw new Error(result);
  return { themesDirectory: themeDirectory() };
});

ipcMain.handle("themes:import", async (event) => {
  const result = await dialog.showOpenDialog(windowForEvent(event), {
    title: `Import ${appManifest.windowTitle} theme`,
    properties: ["openFile"],
    filters: [
      { name: `${appManifest.windowTitle} themes`, extensions: ["json", appManifest.themeFileExtension] },
      { name: "All files", extensions: ["*"] },
    ],
  });
  const sourcePath = result.canceled ? null : result.filePaths[0];
  if (!sourcePath) return null;
  const parsed = JSON.parse(await fs.readFile(sourcePath, "utf8"));
  const theme = parsed?.theme && typeof parsed.theme === "object" && !Array.isArray(parsed.theme) ? parsed.theme : parsed;
  if (!theme || typeof theme !== "object" || Array.isArray(theme)) throw new Error("This file does not contain a valid VaultKit theme.");
  const name = String(parsed?.name || path.parse(sourcePath).name).trim() || "Imported Theme";
  await fs.mkdir(themeDirectory(), { recursive: true });
  await fs.writeFile(path.join(themeDirectory(), safeThemeFileName(name)), JSON.stringify({
    schemaVersion: 1,
    type: "mister-companion-vaultkit-theme",
    name,
    theme,
  }, null, 2), "utf8");
  const currentState = readThemeState();
  await writeThemeState({ activeTheme: theme, sidebarGlyphs: currentState.sidebarGlyphs });
  return { name, theme, themesDirectory: themeDirectory() };
});

ipcMain.handle("themes:export-bundle", async (event, value = {}) => {
  const bundle = buildThemeBundle(value || readThemeState());
  if (!bundle.activeTheme && !bundle.savedThemes.length && !Object.keys(bundle.sidebarGlyphs || {}).length) throw new Error("There are no themes to export.");
  const result = await dialog.showSaveDialog(windowForEvent(event), {
    title: `Export ${appManifest.windowTitle} themes`,
    defaultPath: safeThemeFileName(`${appManifest.windowTitle} Themes`).replace(/\.json$/i, ".themes.json"),
    filters: [
      { name: `${appManifest.windowTitle} theme bundle`, extensions: ["json"] },
      { name: "All files", extensions: ["*"] },
    ],
  });
  if (result.canceled || !result.filePath) return null;
  await fs.writeFile(result.filePath, JSON.stringify(bundle, null, 2), "utf8");
  return { filePath: result.filePath, savedThemes: bundle.savedThemes.length, hasActiveTheme: Boolean(bundle.activeTheme) };
});

ipcMain.handle("themes:import-bundle", async (event) => {
  const result = await dialog.showOpenDialog(windowForEvent(event), {
    title: `Import ${appManifest.windowTitle} theme or bundle`,
    properties: ["openFile"],
    filters: [
      { name: `${appManifest.windowTitle} themes`, extensions: ["json", appManifest.themeFileExtension] },
      { name: "All files", extensions: ["*"] },
    ],
  });
  const sourcePath = result.canceled ? null : result.filePaths[0];
  if (!sourcePath) return null;
  const parsed = JSON.parse(await fs.readFile(sourcePath, "utf8"));
  const imported = parseImportedThemeBundle(parsed, path.parse(sourcePath).name);
  const currentState = readThemeState();
  const nextState = {
    activeTheme: imported.activeTheme || currentState.activeTheme,
    sidebarGlyphs: { ...currentState.sidebarGlyphs, ...imported.sidebarGlyphs },
  };
  await writeThemeState(nextState);
  for (const record of imported.savedThemes) {
    await fs.writeFile(path.join(themeDirectory(), safeThemeFileName(record.name)), JSON.stringify({
      schemaVersion: 1,
      type: "mister-companion-vaultkit-theme",
      name: record.name,
      theme: record.theme,
    }, null, 2), "utf8");
  }
  return { ...nextState, savedThemes: readThemeFiles(), importedCount: imported.savedThemes.length, filePath: sourcePath };
});

ipcMain.handle("youtube:open-login", () => {
  if (youtubeLoginWindow && !youtubeLoginWindow.isDestroyed()) {
    youtubeLoginWindow.focus();
    return true;
  }
  youtubeLoginWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 760,
    minHeight: 560,
    title: `YouTube Login - ${appManifest.windowTitle}`,
    parent: mainWindow || undefined,
    icon: path.join(__dirname, "..", appManifest.iconPath),
    webPreferences: {
      partition: "persist:trailer-players",
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  youtubeLoginWindow.removeMenu();
  const trailerSession = session.fromPartition("persist:trailer-players");
  const userAgent = trailerSession.getUserAgent().replace(/\sElectron\/[^\s]+/g, "");
  youtubeLoginWindow.webContents.setUserAgent(userAgent);
  youtubeLoginWindow.webContents.setWindowOpenHandler(({ url }) => {
    youtubeLoginWindow.loadURL(url);
    return { action: "deny" };
  });
  youtubeLoginWindow.on("closed", () => {
    youtubeLoginWindow = null;
  });
  youtubeLoginWindow.loadURL("https://www.youtube.com/account");
  return true;
});

ipcMain.handle("trailers:choose-local", async (event, details = {}) => {
  const owner = windowForEvent(event);
  const result = await dialog.showOpenDialog(owner, {
    title: "Choose local trailer",
    properties: ["openFile"],
    filters: [
      { name: "Video files", extensions: ["mp4", "m4v", "webm", "mov", "ogv", "ogg"] },
      { name: "All files", extensions: ["*"] },
    ],
  });
  const sourcePath = result.canceled ? null : result.filePaths[0];
  if (!sourcePath) return null;

  const extension = path.extname(sourcePath).toLowerCase() || ".mp4";
  const itemKey = String(details.itemKey || "trailer").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 72) || "trailer";
  const fileName = `${itemKey}-${Date.now()}${extension}`;
  const destinationDirectory = trailerDirectory();
  const destinationPath = path.join(destinationDirectory, fileName);
  await fs.mkdir(destinationDirectory, { recursive: true });
  await fs.copyFile(sourcePath, destinationPath);

  return { fileName, originalName: path.basename(sourcePath) };
});

ipcMain.on("fonts:list", (event) => {
  try { event.returnValue = readFontFiles(); } catch { event.returnValue = []; }
});

ipcMain.handle("fonts:open-folder", async () => {
  await fs.mkdir(fontDirectory(), { recursive: true });
  const result = await shell.openPath(fontDirectory());
  if (result) throw new Error(result);
  return { fontsDirectory: fontDirectory() };
});

ipcMain.handle("assets:open-folder", async () => {
  await fs.mkdir(assetDirectory(), { recursive: true });
  const result = await shell.openPath(assetDirectory());
  if (result) throw new Error(result);
  return { assetsDirectory: assetDirectory() };
});

ipcMain.handle("assets:reload", async () => {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.reloadIgnoringCache();
  }
  return true;
});

ipcMain.handle("trailers:remove-local", async (_event, fileName) => {
  const safeName = safeTrailerFileName(fileName);
  if (safeName) await fs.rm(path.join(trailerDirectory(), safeName), { force: true });
  return true;
});

ipcMain.on("trailers:url", (event, fileName) => {
  const safeName = safeTrailerFileName(fileName);
  const filePath = safeName ? path.join(trailerDirectory(), safeName) : "";
  event.returnValue = filePath && fsSync.existsSync(filePath)
    ? `${appManifest.mediaScheme}://trailer/${encodeURIComponent(safeName)}`
    : null;
});

ipcMain.on("trailers:youtube-player-url", (event, videoId) => {
  const safeVideoId = String(videoId || "").match(/^[a-zA-Z0-9_-]{6,32}$/)?.[0];
  event.returnValue = safeVideoId && trailerPlayerOrigin
    ? `${trailerPlayerOrigin}/youtube/${encodeURIComponent(safeVideoId)}`
    : null;
});

ipcMain.handle("lddb:find-cover", async (_event, disc) => {
  return await findCoverForDisc(disc, false);
});

ipcMain.handle("lddb:find-cover-session", async (_event, disc) => {
  return await findCoverForDisc(disc, true);
});

ipcMain.handle("lddb:cover-from-search-window", async () => {
  return await findCoverInSearchWindow();
});

ipcMain.handle("lddb:image-to-data-url", async (_event, url) => {
  return await imageToDataUrl(String(url || ""));
});

ipcMain.handle("lddb:download-cover-to-scan", async (_event, url) => {
  return await downloadImageToScan(String(url || ""));
});

function windowForEvent(event) {
  return BrowserWindow.fromWebContents(event.sender);
}


// MiSTer Companion EX Python backend bridge. The renderer calls one generic IPC
// method, while Electron owns the child process lifetime.
ipcMain.handle("backend:call", async (_event, method, params = {}, options = {}) => {
  return await callBackend(method, params, options?.timeoutMs || 30000);
});

ipcMain.handle("backend:info", () => backendInfo());

ipcMain.handle("dialog:choose-directory", async (event, options = {}) => {
  const win = windowForEvent(event);
  const result = await dialog.showOpenDialog(win, {
    title: options.title || "Choose folder",
    properties: ["openDirectory"],
  });
  if (result.canceled || !result.filePaths?.length) return null;
  return result.filePaths[0];
});

ipcMain.handle("dialog:choose-file", async (event, options = {}) => {
  const win = windowForEvent(event);
  const result = await dialog.showOpenDialog(win, {
    title: options.title || "Choose file",
    properties: ["openFile"],
    filters: Array.isArray(options.filters) ? options.filters : undefined,
  });
  if (result.canceled || !result.filePaths?.length) return null;
  return result.filePaths[0];
});

ipcMain.handle("dialog:save-file", async (event, options = {}) => {
  const win = windowForEvent(event);
  const result = await dialog.showSaveDialog(win, {
    title: options.title || "Save file",
    defaultPath: options.defaultPath || undefined,
    filters: Array.isArray(options.filters) ? options.filters : undefined,
  });
  if (result.canceled || !result.filePath) return null;
  return result.filePath;
});

ipcMain.handle("shell:open-path", async (_event, filePath) => {
  const target = String(filePath || "");
  if (!target) return { ok: false, error: "No path provided" };
  const error = await shell.openPath(target);
  return error ? { ok: false, error } : { ok: true };
});


function encodeQueryValue(value) {
  return Buffer.from(String(value || ""), "utf8").toString("base64url");
}

function createManualPdfWindow(filePath, options = {}) {
  const target = path.resolve(String(filePath || ""));
  if (!target || path.extname(target).toLowerCase() !== ".pdf") throw new Error("Only PDF manual files can be viewed.");
  if (!fsSync.existsSync(target)) throw new Error("Manual PDF was not found.");
  const title = String(options?.title || path.basename(target));
  const systemName = String(options?.system || "Manuals");
  const win = new BrowserWindow({
    width: 1276,
    height: 956,
    minWidth: 860,
    minHeight: 660,
    show: false,
    title: `${title} - ${appManifest.windowTitle}`,
    frame: false,
    thickFrame: true,
    movable: true,
    resizable: true,
    maximizable: true,
    minimizable: true,
    transparent: true,
    roundedCorners: false,
    hasShadow: false,
    icon: path.join(__dirname, "..", appManifest.iconPath),
    backgroundColor: "#00000000",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });
  freelyResizableWindows.add(win);
  win.removeMenu();
  win.once("ready-to-show", () => win.show());
  win.on("closed", () => {
    activeWindowMoves.delete(win);
  });
  const query = {
    manualPdf: "1",
    path: encodeQueryValue(target),
    title: encodeQueryValue(title),
    system: encodeQueryValue(systemName),
  };
  if (isDev) {
    const url = new URL("http://127.0.0.1:5173/");
    Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));
    win.loadURL(url.href);
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"), { query });
  }
  return win;
}

ipcMain.handle("manuals:file-url", async (_event, filePath) => {
  const target = path.resolve(String(filePath || ""));
  if (!target || path.extname(target).toLowerCase() !== ".pdf") throw new Error("Only PDF manual files can be viewed.");
  if (!fsSync.existsSync(target)) throw new Error("Manual PDF was not found.");
  const token = Buffer.from(`${target}|${Date.now()}|${Math.random()}`).toString("base64url").slice(0, 28);
  manualFileTokens.set(token, target);
  const safeName = encodeURIComponent(path.basename(target));
  return `${appManifest.mediaScheme}://manual/${token}/${safeName}`;
});

ipcMain.handle("manuals:open-window", async (_event, filePath, options = {}) => {
  const win = createManualPdfWindow(filePath, options);
  return { ok: true, id: win.id };
});

ipcMain.handle("window:minimize", (event) => {
  windowForEvent(event)?.minimize();
  return true;
});

ipcMain.handle("window:toggle-maximize", (event) => {
  return toggleWindowMaximize(windowForEvent(event));
});

ipcMain.handle("window:is-maximized", (event) => Boolean(windowForEvent(event)?.isMaximized()));
ipcMain.handle("window:is-focused", (event) => Boolean(windowForEvent(event)?.isFocused()));

ipcMain.handle("window:set-platinum-smaller", (event, enabled) => {
  const win = windowForEvent(event);
  if (!win || win !== mainWindow) return { ok: false };
  const size = applyFixedWindowSize(win, Boolean(enabled));
  return { ok: Boolean(size), smallerWindow: Boolean(enabled), ...(size || {}) };
});

ipcMain.on("window:move-start", (event, point = {}) => {
  const win = windowForEvent(event);
  const x = Number(point.x);
  const y = Number(point.y);
  if (!win || win.isMaximized() || !Number.isFinite(x) || !Number.isFinite(y)) return;
  activeWindowMoves.set(win, {
    startX: x,
    startY: y,
    bounds: win.getBounds(),
  });
});

ipcMain.on("window:move-update", (event, point = {}) => {
  const win = windowForEvent(event);
  const move = win && activeWindowMoves.get(win);
  const x = Number(point.x);
  const y = Number(point.y);
  if (!win || !move || win.isDestroyed() || win.isMaximized() || !Number.isFinite(x) || !Number.isFinite(y)) return;
  win.setPosition(
    Math.round(move.bounds.x + x - move.startX),
    Math.round(move.bounds.y + y - move.startY),
  );
});

ipcMain.on("window:move-end", (event) => {
  const win = windowForEvent(event);
  if (win) activeWindowMoves.delete(win);
});

ipcMain.on("window:resize-start", () => {
  // Manual resize handles are intentionally disabled. The main window uses a
  // fixed normal size while retaining minimize and maximize/restore controls.
});

ipcMain.on("window:resize-update", () => {});
ipcMain.on("window:resize-end", () => {});

ipcMain.handle("window:close", (event) => {
  windowForEvent(event)?.close();
  return true;
});

function splashBuildDate() {
  try {
    const sourcePath = app.isPackaged ? process.execPath : path.join(__dirname, "..", "package.json");
    const modified = fsSync.statSync(sourcePath).mtime;
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(modified);
  } catch {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date());
  }
}

function resolvePackagedAssetPath(...parts) {
  const candidates = [
    path.join(__dirname, "..", ...parts),
    path.join(process.resourcesPath || "", "app.asar", ...parts),
    path.join(process.resourcesPath || "", ...parts),
  ];
  return candidates.find((candidate) => candidate && fsSync.existsSync(candidate)) || candidates[0];
}

function splashHtml(about = false) {
  const logoPath = resolvePackagedAssetPath(...String(appManifest.wordmarkPath || appManifest.iconPath).split(/[\/]+/));
  const fallbackLogoPath = resolvePackagedAssetPath(...String(appManifest.iconPath || "build/mister-companion.png").split(/[\/]+/));
  const readableLogoPath = fsSync.existsSync(logoPath) ? logoPath : fallbackLogoPath;
  const logoData = fsSync.readFileSync(readableLogoPath).toString("base64");
  const version = packageMetadata.displayVersion || app.getVersion();
  const author = typeof packageMetadata.author === "string" ? packageMetadata.author : "Arcanthur";
  const buildDate = splashBuildDate();
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    *{box-sizing:border-box}
    html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#111318;color:#e9edf2;font-family:Inter,"Segoe UI",sans-serif}
    body{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:34px 42px 24px;border:1px solid #3d4652}
    .logo{display:block;width:min(460px,86vw);height:auto;margin-bottom:38px;filter:drop-shadow(0 8px 18px rgba(0,0,0,.5))}
    .loading{width:min(480px,88vw)}
    .track{height:7px;overflow:hidden;border:1px solid #46515e;border-radius:4px;background:#080a0d}
    .fill{width:8%;height:100%;background:#73c7de;box-shadow:0 0 14px rgba(115,199,222,.65);transition:width .22s ease}
    .status{min-height:18px;margin-top:9px;color:#8d99a6;font-size:11px;text-align:center}
    .meta{position:absolute;right:22px;bottom:15px;left:22px;color:#68737f;font-size:10px;text-align:center}
    .about .logo{margin-bottom:0}
    .about .loading{display:none}
    .close{position:absolute;top:12px;right:12px;width:30px;height:30px;display:grid;place-items:center;border:1px solid #3d4652;border-radius:6px;background:transparent;color:#8d99a6;font:18px/1 "Segoe UI Symbol","Segoe UI",sans-serif;cursor:pointer}
    .close:hover{border-color:#73c7de;color:#e9edf2}
  </style>
</head>
<body class="${about ? "about" : "startup"}">
  ${about ? '<button class="close" type="button" aria-label="Close">×</button>' : ""}
  <img class="logo" src="data:image/png;base64,${logoData}" alt="${appManifest.windowTitle}">
  <div class="loading">
    <div class="track"><div id="fill" class="fill"></div></div>
    <div id="status" class="status">${appManifest.startupStatus}</div>
  </div>
  <div class="meta">Version ${version} &nbsp; | &nbsp; ${author} &nbsp; | &nbsp; Build ${buildDate}</div>
  <script>
    window.setProgress=(value,label)=>{
      document.getElementById("fill").style.width=Math.max(8,Math.min(100,value))+"%";
      if(label) document.getElementById("status").textContent=label;
    };
    ${about ? 'document.querySelector(".close").addEventListener("click",()=>window.close());document.addEventListener("keydown",event=>{if(event.key==="Escape")window.close()});document.body.addEventListener("click",event=>{if(event.target===document.body)window.close()});' : ""}
  </script>
</body>
</html>`;
}

function createSplashWindow(about = false) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.focus();
    return splashWindow;
  }
  splashWindow = new BrowserWindow({
    width: 620,
    height: 330,
    show: false,
    frame: false,
    resizable: false,
    movable: true,
    center: true,
    alwaysOnTop: !about,
    skipTaskbar: true,
    parent: about && mainWindow ? mainWindow : undefined,
    modal: Boolean(about && mainWindow),
    backgroundColor: "#111318",
    icon: path.join(__dirname, "..", appManifest.iconPath),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  splashWindow.removeMenu();
  if (!about) splashWindow.webContents.once("did-finish-load", () => setSplashProgress(18, "Preparing portable library..."));
  splashWindow.once("ready-to-show", () => splashWindow?.show());
  splashWindow.on("closed", () => {
    splashWindow = null;
  });
  splashWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(splashHtml(about)));
  return splashWindow;
}

function setSplashProgress(value, label) {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  splashWindow.webContents.executeJavaScript(`window.setProgress?.(${Number(value)},${JSON.stringify(label || "")})`).catch(() => {});
}

function revealMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isVisible()) return;
  if (rendererReadyTimer) {
    clearTimeout(rendererReadyTimer);
    rendererReadyTimer = null;
  }
  setSplashProgress(100, "Ready");
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
  }, 180);
}

ipcMain.on("app:renderer-ready", (event) => {
  if (mainWindow && event.sender === mainWindow.webContents) revealMainWindow();
});

ipcMain.on("renderer:startup-problem", (event, payload = {}) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) return;
  const details = payload.stack || JSON.stringify(payload, null, 2);
  showDiagnosticInMainWindow("Renderer startup problem", payload.message || payload.kind || "Unknown renderer error", details);
});

ipcMain.handle("app:get-about-info", () => ({
  version: packageMetadata.displayVersion || app.getVersion(),
  author: typeof packageMetadata.author === "string" ? packageMetadata.author : "Arcanthur",
  buildDate: splashBuildDate(),
  electron: process.versions.electron || "Unknown",
  chromium: process.versions.chrome || "Unknown",
  node: process.versions.node || "Unknown",
}));

function sendThemePreviewUpdate() {
  if (!themePreviewWindow || themePreviewWindow.isDestroyed() || !themePreviewTheme) return;
  themePreviewWindow.webContents.send("theme-preview:update", themePreviewTheme);
}

function createThemePreviewWindow(theme) {
  themePreviewTheme = theme && typeof theme === "object" ? theme : {};
  if (themePreviewWindow && !themePreviewWindow.isDestroyed()) {
    sendThemePreviewUpdate();
    themePreviewWindow.show();
    themePreviewWindow.focus();
    return themePreviewWindow;
  }

  themePreviewWindow = new BrowserWindow({
    width: 520,
    height: 540,
    minWidth: 430,
    minHeight: 480,
    show: false,
    title: appManifest.themePreviewTitle,
    frame: false,
    movable: true,
    resizable: true,
    parent: mainWindow || undefined,
    modal: false,
    icon: path.join(__dirname, "..", appManifest.iconPath),
    backgroundColor: "#0a0a16",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });
  themePreviewWindow.removeMenu();
  themePreviewWindow.once("ready-to-show", () => themePreviewWindow?.show());
  themePreviewWindow.webContents.on("did-finish-load", sendThemePreviewUpdate);
  themePreviewWindow.on("closed", () => {
    themePreviewWindow = null;
    themePreviewTheme = null;
  });

  if (isDev) {
    themePreviewWindow.loadURL("http://127.0.0.1:5173/?themePreview=1");
  } else {
    themePreviewWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"), {
      query: { themePreview: "1" },
    });
  }
  return themePreviewWindow;
}

ipcMain.handle("theme-preview:open", (_event, theme) => {
  createThemePreviewWindow(theme);
  return true;
});

ipcMain.handle("theme-preview:update", (_event, theme) => {
  themePreviewTheme = theme && typeof theme === "object" ? theme : {};
  sendThemePreviewUpdate();
  return true;
});

function createWindow() {
  const fixedSize = fixedNormalWindowSize();
  const win = new BrowserWindow({
    width: fixedSize.width,
    height: fixedSize.height,
    minWidth: fixedSize.width,
    minHeight: fixedSize.height,
    show: false,
    title: appManifest.windowTitle,
    frame: false,
    thickFrame: false,
    // Fixed normal window: no manual edge/corner resizing, so transparent
    // drop-shadow gutters never expose resize grabbers. Maximize/restore and
    // minimize remain available through the custom titlebar controls.
    resizable: false,
    maximizable: true,
    minimizable: true,
    // The renderer draws the rounded VaultKit window and shadow inside a transparent
    // frameless BrowserWindow. This prevents the square opaque corner triangles
    // around the CSS-rounded app surface.
    transparent: true,
    roundedCorners: false,
    hasShadow: false,
    icon: path.join(__dirname, "..", appManifest.iconPath),
    backgroundColor: "#00000000",
    webPreferences: { contextIsolation: true, nodeIntegration: false, webviewTag: true, preload: path.join(__dirname, "preload.cjs") },
  });
  mainWindow = win;
  win.on("closed", () => {
    activeWindowMoves.delete(win);
  });
  if (process.platform === "win32") {
    const WM_NCLBUTTONDBLCLK = 0x00A3;
    const HTCAPTION = 2;
    win.hookWindowMessage(WM_NCLBUTTONDBLCLK, (wParam) => {
      if (wParam.length >= 4 && wParam.readUInt32LE(0) === HTCAPTION) toggleWindowMaximize(win);
    });
  }

  win.removeMenu();
  win.once("ready-to-show", () => {
    setSplashProgress(82, "Finishing interface...");
  });
  win.webContents.on("did-finish-load", () => {
    setSplashProgress(70, "Loading device checks...");
  });
  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    showDiagnosticInMainWindow("Renderer failed to load", `${errorDescription} (${errorCode})`, validatedURL || "");
  });
  win.webContents.on("render-process-gone", (_event, details) => {
    showDiagnosticInMainWindow("Renderer process exited", details?.reason || "unknown", JSON.stringify(details || {}, null, 2));
  });
  win.webContents.on("unresponsive", () => {
    logStartup("Main window became unresponsive");
    setSplashProgress(96, "Still loading…");
  });
  win.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    logStartup(`Renderer console[${level}]`, `${message} (${sourceId}:${line})`);
  });
  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
  });
  win.webContents.on("will-attach-webview", (event, webPreferences, params) => {
    let allowed = false;
    try {
      const hostname = new URL(params.src).hostname;
      allowed = hostname === "youtube.com"
        || hostname.endsWith(".youtube.com")
        || hostname === "127.0.0.1"
        || hostname === "vimeo.com"
        || hostname.endsWith(".vimeo.com")
        || hostname === "dailymotion.com"
        || hostname.endsWith(".dailymotion.com");
    } catch {}
    if (!allowed) {
      event.preventDefault();
      return;
    }
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
  });
  win.webContents.on("did-attach-webview", (_event, guest) => {
    guest.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: "deny" };
    });
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  const sendMaximizedState = () => {
    if (!win.isDestroyed()) win.webContents.send("window:maximized-change", win.isMaximized());
  };
  const sendFocusedState = (focused) => {
    if (!win.isDestroyed()) win.webContents.send("window:focus-change", focused);
  };
  win.on("maximize", sendMaximizedState);
  win.on("unmaximize", () => {
    sendMaximizedState();
    lockManualResize(win);
  });
  win.on("focus", () => sendFocusedState(true));
  win.on("blur", () => sendFocusedState(false));

  const loadPromise = isDev
    ? win.loadURL("http://127.0.0.1:5173")
    : win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  loadPromise.catch((error) => {
    showDiagnosticInMainWindow("Renderer load promise failed", error.message || String(error), error.stack || "");
  });

  rendererReadyTimer = setTimeout(() => {
    if (mainWindow === win && splashWindow && !splashWindow.isDestroyed()) {
      logStartup("Renderer ready timeout reached; keeping splash visible while startup continues");
      setSplashProgress(96, "Waiting for app data…");
    }
  }, 12000);
}

app.whenReady().then(async () => {
  logStartup("Electron app ready", `packaged=${app.isPackaged} userData=${app.getPath("userData")}`);
  createSplashWindow();
  setSplashProgress(18, "Preparing portable library...");
  await migrateLegacyStorageLayout();
  setSplashProgress(42, "Starting Python backend...");
  process.env.MISTER_COMPANION_DATA_DIR = backendDataPath;
  process.env.MISTER_COMPANION_TOOLS_DIR = portableToolsPath;
  try {
    await Promise.all([
      fs.mkdir(process.env.MISTER_COMPANION_DATA_DIR, { recursive: true }),
      fs.mkdir(process.env.MISTER_COMPANION_TOOLS_DIR, { recursive: true }),
      fs.mkdir(portableFontsPath, { recursive: true }),
      fs.mkdir(portableAssetsPath, { recursive: true }),
    ]);
  } catch {}
  try { startBackend(); logStartup("Python backend started", backendInfo().pythonCommand || "unknown"); } catch (error) { console.warn("Python backend deferred:", error.message); logStartup("Python backend deferred", error.stack || error.message); }
  setSplashProgress(58, "Loading VaultKit shell...");
  protocol.handle(appManifest.mediaScheme, (request) => {
    const parsed = new URL(request.url);
    if (parsed.hostname === "manual") {
      const token = decodeURIComponent(parsed.pathname.replace(/^\/+/, "").split("/")[0] || "");
      const filePath = manualFileTokens.get(token);
      if (!filePath || path.extname(filePath).toLowerCase() !== ".pdf" || !fsSync.existsSync(filePath)) {
        return new Response("Manual not found", { status: 404 });
      }
      return net.fetch(pathToFileURL(filePath).href);
    }
    if (parsed.hostname === "asset") {
      const relativePath = safeAssetRelativePath(decodeURIComponent(parsed.pathname.replace(/^\/+/, "")));
      if (!relativePath) return new Response("Not found", { status: 404 });
      const rootPath = path.resolve(assetDirectory());
      const filePath = path.resolve(rootPath, ...relativePath.split("/"));
      if (filePath !== rootPath && !filePath.startsWith(rootPath + path.sep)) return new Response("Not found", { status: 404 });
      if (!fsSync.existsSync(filePath) || !fsSync.statSync(filePath).isFile()) return new Response("Not found", { status: 404 });
      return net.fetch(pathToFileURL(filePath).href, { cache: "no-store" });
    }
    const isFont = parsed.hostname === "font";
    const fileName = isFont
      ? safeFontFileName(decodeURIComponent(parsed.pathname.replace(/^\/+/, "")))
      : safeTrailerFileName(decodeURIComponent(parsed.pathname.replace(/^\/+/, "")));
    if (!fileName) return new Response("Not found", { status: 404 });
    return net.fetch(pathToFileURL(path.join(isFont ? fontDirectory() : trailerDirectory(), fileName)).href, { cache: "no-store" });
  });
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSplashWindow();
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (rendererReadyTimer) clearTimeout(rendererReadyTimer);
  trailerPlayerServer?.close();
  trailerPlayerServer = null;
  stopBackend();
});
