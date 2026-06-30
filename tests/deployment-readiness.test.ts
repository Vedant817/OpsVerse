import test from "node:test";
import assert from "node:assert/strict";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const scriptPath = resolve("scripts/deployment-readiness.mjs");

const envExample = `
CEREBRAS_API_KEY=
CEREBRAS_BASE_URL=https://api.cerebras.ai/v1
CEREBRAS_MODEL=gemma-4-31b
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
BASELINE_PROVIDER_ENABLED=false
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash
`;

const schemaSql = `
create table if not exists incidents (id uuid primary key);
create table if not exists incident_evidence (id uuid primary key);
create table if not exists agent_runs (id uuid primary key);
create table if not exists speed_benchmarks (id uuid primary key);
create table if not exists demo_sessions (id uuid primary key);
`;

function createRepoFixture({
  withRemote,
  withFakeCli,
  gitEmail = "vedantmahajan271@gmail.com",
  envExampleContent = envExample,
  schemaSqlContent = schemaSql,
}: {
  withRemote: boolean;
  withFakeCli: boolean;
  gitEmail?: string;
  envExampleContent?: string;
  schemaSqlContent?: string;
}) {
  const dir = mkdtempSync(join(tmpdir(), "opsverse-deploy-"));
  mkdirSync(join(dir, "supabase"));
  writeFileSync(join(dir, ".env.example"), envExampleContent);
  writeFileSync(join(dir, ".gitignore"), ".env*\n!.env.example\n.vercel\n");
  writeFileSync(join(dir, "vercel.json"), "{}");
  writeFileSync(join(dir, "supabase/schema.sql"), schemaSqlContent);
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(
      {
        scripts: {
          typecheck: "tsc --noEmit",
          lint: "eslint",
          build: "next build --turbopack",
          "verify:local": "npm run typecheck",
        },
      },
      null,
      2,
    ),
  );

  execFileSync("git", ["init"], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["config", "--local", "user.name", "Vedant Mahajan"], {
    cwd: dir,
  });
  execFileSync(
    "git",
    ["config", "--local", "user.email", gitEmail],
    { cwd: dir },
  );
  if (withRemote) {
    execFileSync(
      "git",
      ["remote", "add", "origin", "git@github.com:Vedant817/OpsVerse.git"],
      { cwd: dir },
    );
  }
  execFileSync("git", ["add", "."], { cwd: dir });

  const binDir = join(dir, "bin");
  if (withFakeCli) {
    mkdirSync(binDir);
    for (const command of ["gh", "vercel"]) {
      const executable = join(binDir, command);
      writeFileSync(executable, "#!/bin/sh\nexit 0\n");
      chmodSync(executable, 0o755);
    }
  }

  return {
    dir,
    env: {
      ...process.env,
      PATH: withFakeCli
        ? `${binDir}${delimiter}${process.env.PATH ?? ""}`
        : "/usr/bin:/bin:/usr/sbin:/sbin",
    },
  };
}

function runDeploymentReadiness(cwd: string, env: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd,
    env,
    encoding: "utf8",
  });
}

test("deployment readiness passes with personal git identity, remote, fake CLIs, schema, and placeholders", () => {
  const fixture = createRepoFixture({ withRemote: true, withFakeCli: true });
  const result = runDeploymentReadiness(fixture.dir, fixture.env);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PASS Repo-local git user.email uses personal account/);
  assert.match(result.stdout, /PASS Git remote is configured/);
  assert.match(result.stdout, /PASS GitHub CLI is installed/);
  assert.match(result.stdout, /PASS Vercel CLI is installed/);
  assert.match(result.stdout, /All deployment readiness checks passed/);
});

test("deployment readiness fails closed when remote and required CLIs are missing", () => {
  const fixture = createRepoFixture({ withRemote: false, withFakeCli: false });
  const result = runDeploymentReadiness(fixture.dir, fixture.env);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /FAIL Git remote is configured/);
  assert.match(result.stdout, /FAIL GitHub CLI is installed/);
  assert.match(result.stdout, /FAIL Vercel CLI is installed/);
  assert.match(result.stderr, /3 deployment readiness check\(s\) failed/);
});

test("deployment readiness rejects the work git email", () => {
  const fixture = createRepoFixture({
    withRemote: true,
    withFakeCli: true,
    gitEmail: "vedant.mahajan@salescode.ai",
  });
  const result = runDeploymentReadiness(fixture.dir, fixture.env);

  assert.equal(result.status, 1);
  assert.match(
    result.stdout,
    /FAIL Repo-local git user\.email uses personal account - vedant\.mahajan@salescode\.ai/,
  );
});

test("deployment readiness rejects non-placeholder secret values in env examples", () => {
  const fixture = createRepoFixture({
    withRemote: true,
    withFakeCli: true,
    envExampleContent: envExample.replace(
      "GEMINI_API_KEY=",
      "GEMINI_API_KEY=real-gemini-key",
    ),
  });
  const result = runDeploymentReadiness(fixture.dir, fixture.env);

  assert.equal(result.status, 1);
  assert.match(
    result.stdout,
    /FAIL \.env\.example does not contain private secret values - non-placeholder: GEMINI_API_KEY/,
  );
  assert.match(
    result.stdout,
    /FAIL Tracked files do not contain obvious committed secrets/,
  );
});

test("deployment readiness rejects incomplete Supabase schema", () => {
  const fixture = createRepoFixture({
    withRemote: true,
    withFakeCli: true,
    schemaSqlContent: schemaSql.replace(
      "create table if not exists demo_sessions (id uuid primary key);",
      "",
    ),
  });
  const result = runDeploymentReadiness(fixture.dir, fixture.env);

  assert.equal(result.status, 1);
  assert.match(
    result.stdout,
    /FAIL Supabase schema includes required MVP tables - missing: demo_sessions/,
  );
});
