const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const packageLock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"));
const tag = process.argv[2] || process.env.GITHUB_REF_NAME || "";
const version = String(packageJson.version || "");
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/;

const failures = [];
if (!semverPattern.test(version)) failures.push(`package.json version is not valid SemVer: ${version || "<missing>"}`);
if (packageLock.version !== version) failures.push(`package-lock.json version ${packageLock.version} does not match ${version}`);
if (packageLock.packages?.[""]?.version !== version) failures.push(`package-lock root version ${packageLock.packages?.[""]?.version} does not match ${version}`);
if (tag && tag !== `v${version}`) failures.push(`tag ${tag} must exactly match v${version}`);

const artifactNames = [packageJson.build?.artifactName, packageJson.build?.win?.artifactName].filter(Boolean);
if (!artifactNames.length || artifactNames.some((name) => !String(name).includes("${version}"))) {
  failures.push("electron-builder artifact names must use the ${version} macro");
}

if (failures.length) {
  console.error("Release version verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Release version verified: v${version}`);
