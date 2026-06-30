import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const scriptPath = resolve("scripts/secret-scan.mjs");

function createGitFixture() {
  const dir = mkdtempSync(join(tmpdir(), "opsverse-secret-"));
  execFileSync("git", ["init"], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["config", "--local", "user.name", "Vedant Mahajan"], {
    cwd: dir,
  });
  execFileSync(
    "git",
    ["config", "--local", "user.email", "vedantmahajan271@gmail.com"],
    { cwd: dir },
  );
  return dir;
}

function runSecretScan(cwd: string) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd,
    encoding: "utf8",
  });
}

test("secret scan passes with placeholder env values", () => {
  const cwd = createGitFixture();
  writeFileSync(
    join(cwd, ".env.example"),
    [
      "CEREBRAS_API_KEY=",
      "SUPABASE_SERVICE_ROLE_KEY=your-server-side-key",
      "GEMINI_API_KEY=placeholder",
    ].join("\n"),
  );
  execFileSync("git", ["add", ".env.example"], { cwd });

  const result = runSecretScan(cwd);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Secret scan passed/);
});

test("secret scan fails on tracked provider tokens", () => {
  const cwd = createGitFixture();
  writeFileSync(
    join(cwd, "leak.txt"),
    "CEREBRAS_API_KEY=csk-1234567890abcdefghijklmnopqrstuvwxyz",
  );
  execFileSync("git", ["add", "leak.txt"], { cwd });

  const result = runSecretScan(cwd);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Secret scan failed/);
  assert.match(result.stderr, /Cerebras API key/);
  assert.match(result.stderr, /non-empty secret env assignment/);
});

test("secret scan fails on built client assets with token-like values", () => {
  const cwd = createGitFixture();
  writeFileSync(join(cwd, "README.md"), "clean tracked file");
  mkdirSync(join(cwd, ".next", "static", "chunks"), { recursive: true });
  writeFileSync(
    join(cwd, ".next", "static", "chunks", "client.js"),
    "window.__token='ghp_1234567890abcdefghijklmnopqrstuvwxyz';",
  );
  execFileSync("git", ["add", "README.md"], { cwd });

  const result = runSecretScan(cwd);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Secret scan failed/);
  assert.match(result.stderr, /\.next\/static\/chunks\/client\.js/);
  assert.match(result.stderr, /GitHub token/);
});
