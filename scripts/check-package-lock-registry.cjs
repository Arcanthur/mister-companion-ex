const fs = require("node:fs");
const path = require("node:path");

const lockPath = path.resolve(__dirname, "..", "package-lock.json");
const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
const allowedRegistry = "registry.npmjs.org";
const invalid = [];

for (const [packagePath, metadata] of Object.entries(lock.packages || {})) {
  const resolved = metadata?.resolved;
  if (!resolved || !/^https?:\/\//i.test(resolved)) continue;
  try {
    const hostname = new URL(resolved).hostname.toLowerCase();
    if (hostname !== allowedRegistry) invalid.push({ packagePath, resolved, reason: `unexpected host ${hostname}` });
  } catch {
    invalid.push({ packagePath, resolved, reason: "invalid URL" });
  }
}

if (invalid.length) {
  console.error(`package-lock.json contains ${invalid.length} non-public registry URL(s):`);
  for (const item of invalid.slice(0, 20)) console.error(`- ${item.packagePath || "<root>"}: ${item.resolved} (${item.reason})`);
  if (invalid.length > 20) console.error(`- ...and ${invalid.length - 20} more`);
  console.error(`Regenerate the lockfile using https://${allowedRegistry}/ before committing.`);
  process.exit(1);
}

console.log(`Lockfile registry verified: all package tarballs use https://${allowedRegistry}/`);
