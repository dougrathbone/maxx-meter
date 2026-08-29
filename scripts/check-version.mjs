#!/usr/bin/env node
/**
 * Verify package.json, dashboard/package.json, and maxxmeter/config.yaml match expected semver.
 * Usage: node scripts/check-version.mjs 1.2.3
 */
import { readFileSync } from "node:fs";

const expected = process.argv[2];
if (!expected || !/^\d+\.\d+\.\d+/.test(expected)) {
  console.error("Usage: node scripts/check-version.mjs <semver>");
  process.exit(1);
}

function readVersion(path) {
  return JSON.parse(readFileSync(path, "utf8")).version;
}

const pkgVersion = readVersion("package.json");
const dashVersion = readVersion("dashboard/package.json");
const config = readFileSync("maxxmeter/config.yaml", "utf8");
const configMatch = config.match(/^version: "(.+)"$/m);
const configVersion = configMatch?.[1];
const refMatch = config.match(/^  GITHUB_REF: (.+)$/m);
const githubRef = refMatch?.[1];

let failed = false;

function check(label, actual) {
  if (actual !== expected) {
    console.error(`✗ ${label}: expected ${expected}, got ${actual ?? "(missing)"}`);
    failed = true;
  } else {
    console.log(`✓ ${label}: ${actual}`);
  }
}

const strict = process.argv.includes("--strict");

check("package.json", pkgVersion);
check("dashboard/package.json", dashVersion);
check("maxxmeter/config.yaml version", configVersion);

if (strict) {
  const expectedRef = `v${expected}`;
  if (githubRef !== expectedRef) {
    console.error(
      `✗ maxxmeter/config.yaml GITHUB_REF: expected ${expectedRef}, got ${githubRef ?? "(missing)"}`,
    );
    failed = true;
  } else {
    console.log(`✓ maxxmeter/config.yaml GITHUB_REF: ${githubRef}`);
  }
} else if (githubRef) {
  console.log(`ℹ maxxmeter/config.yaml GITHUB_REF: ${githubRef} (not checked; use --strict on release)`);
}

if (failed) process.exit(1);
console.log(`All versions aligned at ${expected}`);
