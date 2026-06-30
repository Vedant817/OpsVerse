import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const scriptPath = resolve("scripts/submission-readiness.mjs");

function createRunbook(content: string) {
  const dir = mkdtempSync(join(tmpdir(), "opsverse-submission-"));
  mkdirSync(join(dir, "docs"));
  writeFileSync(join(dir, "docs/demo-and-submission.md"), content);
  return dir;
}

const requiredRunbook = `
# OpsVerse Demo and Submission Runbook

## Verification Prerequisites

- npm run verify:local

## Recording Setup

- Use synthetic data only.

## 60-Second Script

Script.

## Shot List

1. Landing page

## Track 1 Discord Draft

Demo:
<verified demo video link>

Live app:
<verified Vercel production link>

GitHub:
<verified GitHub repository link>

## Track 3 Discord Draft

Demo:
<verified demo video link>

Live app:
<verified Vercel production link>

GitHub:
<verified GitHub repository link>

## Optional X/Twitter Draft

Demo:
<verified demo video link>

Live app:
<verified Vercel production link>

## Final Link Checklist

Replace placeholders only after verification.
`;

function runSubmissionReadiness(cwd: string) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd,
    encoding: "utf8",
  });
}

test("submission readiness fails while verified-link placeholders remain", () => {
  const cwd = createRunbook(requiredRunbook);
  const result = runSubmissionReadiness(cwd);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /PASS Demo and submission runbook exists/);
  assert.match(result.stdout, /FAIL Verified-link placeholders have been replaced/);
  assert.match(result.stdout, /FAIL Submission draft links are verified public URLs/);
  assert.match(result.stderr, /2 submission readiness check\(s\) failed/);
});

test("submission readiness passes with verified public submission links", () => {
  const cwd = createRunbook(
    requiredRunbook
      .replaceAll(
        "<verified demo video link>",
        "https://www.loom.com/share/opsverse-demo",
      )
      .replaceAll(
        "<verified Vercel production link>",
        "https://opsverse.vercel.app",
      )
      .replaceAll(
        "<verified GitHub repository link>",
        "https://github.com/Vedant817/OpsVerse",
      ),
  );
  const result = runSubmissionReadiness(cwd);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PASS Submission draft links are verified public URLs/);
  assert.match(result.stdout, /PASS Verified-link placeholders have been replaced/);
  assert.match(result.stdout, /All submission readiness checks passed/);
});
