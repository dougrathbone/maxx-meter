#!/usr/bin/env node
/**
 * Sync semver across package.json, dashboard/package.json, and maxxmeter/config.yaml.
 * Usage: node scripts/sync-version.mjs 1.2.3
 */
import { readFileSync, writeFileSync } from "node:fs";

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+(-[\w.-]+)?(\+[\w.-]+)?$/.test(version)) {
  console.error("Usage: node scripts/sync-version.mjs <semver>");
  console.error("Example: node scripts/sync-version.mjs 1.2.3");
  process.exit(1);
}

function updateJson(path) {
  const raw = readFileSync(path, "utf8");
  const data = JSON.parse(raw);
  data.version = version;
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Updated ${path} → ${version}`);
}

updateJson("package.json");
updateJson("dashboard/package.json");

let config = readFileSync("maxxmeter/config.yaml", "utf8");
if (!/^version: /m.test(config)) {
  console.error("maxxmeter/config.yaml: missing version field");
  process.exit(1);
}
config = config.replace(/^version: .*/m, `version: "${version}"`);
config = config.replace(/^  GITHUB_REF: .*/m, `  GITHUB_REF: v${version}`);
writeFileSync("maxxmeter/config.yaml", config);
console.log(`Updated maxxmeter/config.yaml → ${version} (GITHUB_REF=v${version})`);
