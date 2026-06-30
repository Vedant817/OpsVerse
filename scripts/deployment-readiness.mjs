#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const workEmail = "vedant.mahajan@salescode.ai";

const requiredEnvKeys = [
  "CEREBRAS_API_KEY",
  "CEREBRAS_BASE_URL",
  "CEREBRAS_MODEL",
  "CEREBRAS_REQUEST_TIMEOUT_MS",
  "CEREBRAS_RETRY_ATTEMPTS",
  "CEREBRAS_RETRY_BACKOFF_MS",
  "CEREBRAS_AGENT_CONCURRENCY",
  "OPSVERSE_LOCAL_AGENT_MODE",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "BASELINE_PROVIDER_ENABLED",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
];

const requiredTables = [
  "incidents",
  "incident_evidence",
  "agent_runs",
  "speed_benchmarks",
  "demo_sessions",
];

const checks = [];

function addCheck(name, ok, detail = "") {
  checks.push({ name, ok, detail });
}

function runGit(args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return "";
  }
}

function commandExists(name) {
  const result = spawnSync("sh", ["-lc", `command -v ${name}`], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return result.status === 0 && result.stdout.trim().length > 0;
}

function readText(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function parseEnvExample() {
  const content = readText(".env.example");
  const values = new Map();

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    values.set(line.slice(0, index), line.slice(index + 1));
  }

  return values;
}

function listTrackedFiles() {
  const output = runGit(["ls-files"]);
  if (!output) return [];
  return output.split(/\r?\n/).filter(Boolean);
}

function scanTrackedSecrets() {
  const secretFindings = [];
  const trackedFiles = listTrackedFiles();
  const envAssignmentPattern =
    /\b(CEREBRAS_API_KEY|SUPABASE_SERVICE_ROLE_KEY|GEMINI_API_KEY)=([^\s"'`]+)/g;
  const tokenPattern =
    /\b(csk-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9_-]{32,}|ghp_[A-Za-z0-9_]{20,})\b/g;

  for (const file of trackedFiles) {
    if (file.startsWith("node_modules/") || file.startsWith(".next/")) continue;
    if (!existsSync(resolve(root, file))) continue;

    let content = "";
    try {
      content = readText(file);
    } catch {
      continue;
    }

    for (const match of content.matchAll(envAssignmentPattern)) {
      const value = match[2].trim();
      const isPlaceholder =
        value === "" ||
        value === "your-server-side-key" ||
        value.toLowerCase().includes("placeholder") ||
        value.toLowerCase().includes("your-");
      if (!isPlaceholder) {
        secretFindings.push(`${file}: ${match[1]} has a non-placeholder value`);
      }
    }

    for (const match of content.matchAll(tokenPattern)) {
      secretFindings.push(`${file}: token-like value ${match[1].slice(0, 8)}...`);
    }
  }

  return secretFindings;
}

const gitName = runGit(["config", "--local", "user.name"]);
const gitEmail = runGit(["config", "--local", "user.email"]);
addCheck("Repo-local git user.name is configured", Boolean(gitName), gitName);
addCheck(
  "Repo-local git user.email uses personal account",
  Boolean(gitEmail) && gitEmail !== workEmail,
  gitEmail || "missing",
);

const remotes = runGit(["remote", "-v"]);
addCheck(
  "Git remote is configured for push/deploy provenance",
  Boolean(remotes),
  remotes || "missing remote",
);

addCheck("GitHub CLI is installed", commandExists("gh"), "required for repo creation/push checks");
addCheck("Vercel CLI is installed", commandExists("vercel"), "required for local Vercel deploy verification");

addCheck("vercel.json exists", existsSync(resolve(root, "vercel.json")));

const packageJson = JSON.parse(readText("package.json"));
const requiredPackageScripts = [
  "typecheck",
  "lint",
  "test",
  "build",
  "verify:secrets",
  "verify:ui",
  "verify:local",
  "verify:deployment",
  "verify:submission",
];

for (const scriptName of requiredPackageScripts) {
  addCheck(
    `package.json has ${scriptName} script`,
    Boolean(packageJson.scripts?.[scriptName]),
    packageJson.scripts?.[scriptName] || "missing",
  );
}

const envValues = parseEnvExample();
const missingEnvKeys = requiredEnvKeys.filter((key) => !envValues.has(key));
addCheck(
  ".env.example documents all runtime env keys",
  missingEnvKeys.length === 0,
  missingEnvKeys.length ? `missing: ${missingEnvKeys.join(", ")}` : "all keys present",
);

const unsafeExampleValues = [];
for (const key of ["CEREBRAS_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "GEMINI_API_KEY"]) {
  const value = envValues.get(key) ?? "";
  if (value && !value.toLowerCase().includes("placeholder") && !value.toLowerCase().includes("your-")) {
    unsafeExampleValues.push(key);
  }
}
addCheck(
  ".env.example does not contain private secret values",
  unsafeExampleValues.length === 0,
  unsafeExampleValues.length ? `non-placeholder: ${unsafeExampleValues.join(", ")}` : "secret placeholders only",
);

const schema = readText("supabase/schema.sql").toLowerCase();
const missingTables = requiredTables.filter((table) => {
  const pattern = new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+(public\\.)?${table}\\b`);
  return !pattern.test(schema);
});
addCheck(
  "Supabase schema includes required MVP tables",
  missingTables.length === 0,
  missingTables.length ? `missing: ${missingTables.join(", ")}` : "all required tables present",
);

const gitignore = readText(".gitignore");
addCheck(".env.local is ignored by git", gitignore.includes(".env*") && gitignore.includes("!.env.example"));
addCheck(".vercel is ignored by git", gitignore.includes(".vercel"));

const secretFindings = scanTrackedSecrets();
addCheck(
  "Tracked files do not contain obvious committed secrets",
  secretFindings.length === 0,
  secretFindings.join("; ") || "no findings",
);

console.log("OpsVerse deployment readiness");
console.log("=============================");
for (const check of checks) {
  const marker = check.ok ? "PASS" : "FAIL";
  const suffix = check.detail ? ` - ${check.detail}` : "";
  console.log(`${marker} ${check.name}${suffix}`);
}

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error(`\n${failed.length} deployment readiness check(s) failed.`);
  process.exit(1);
}

console.log("\nAll deployment readiness checks passed.");
