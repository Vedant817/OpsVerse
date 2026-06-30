#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const runbookPath = "docs/demo-and-submission.md";
const checks = [];

function addCheck(name, ok, detail = "") {
  checks.push({ name, ok, detail });
}

function readText(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function unique(values) {
  return [...new Set(values)];
}

const requiredSections = [
  "## Verification Prerequisites",
  "## Recording Setup",
  "## 60-Second Script",
  "## Shot List",
  "## Track 1 Discord Draft",
  "## Track 3 Discord Draft",
  "## Optional X/Twitter Draft",
  "## Final Link Checklist",
];

const requiredSubmissionLabels = [
  "Demo:",
  "Live app:",
  "GitHub:",
];

const linkRequirements = [
  {
    label: "Demo:",
    name: "demo video",
    pattern: /^https:\/\/[^\s<>()]+$/i,
    detail: "must be an https URL",
  },
  {
    label: "Live app:",
    name: "live app",
    pattern: /^https:\/\/[^\s<>()]+$/i,
    detail: "must be an https URL",
  },
  {
    label: "GitHub:",
    name: "GitHub repository",
    pattern: /^https:\/\/github\.com\/[^/\s<>()]+\/[^/\s<>()]+\/?$/i,
    detail: "must be an https://github.com/<owner>/<repo> URL",
  },
];

function valuesAfterLabel(content, label) {
  const lines = content.split(/\r?\n/);
  const values = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() !== label) {
      continue;
    }

    const nextValue = lines
      .slice(index + 1)
      .find((line) => line.trim().length > 0);
    values.push(nextValue?.trim() ?? "");
  }

  return values;
}

console.log("OpsVerse submission readiness");
console.log("=============================");

if (!existsSync(resolve(root, runbookPath))) {
  addCheck("Demo and submission runbook exists", false, `${runbookPath} missing`);
} else {
  addCheck("Demo and submission runbook exists", true, runbookPath);

  const content = readText(runbookPath);
  const missingSections = requiredSections.filter(
    (section) => !content.includes(section),
  );
  addCheck(
    "Runbook includes all required sections",
    missingSections.length === 0,
    missingSections.length ? `missing: ${missingSections.join(", ")}` : "all sections present",
  );

  const missingLabels = requiredSubmissionLabels.filter(
    (label) => !content.includes(label),
  );
  addCheck(
    "Submission drafts include link labels",
    missingLabels.length === 0,
    missingLabels.length ? `missing: ${missingLabels.join(", ")}` : "demo/live/GitHub labels present",
  );

  const invalidLinks = [];
  for (const requirement of linkRequirements) {
    const values = valuesAfterLabel(content, requirement.label);
    for (const [index, value] of values.entries()) {
      if (!requirement.pattern.test(value)) {
        invalidLinks.push(
          `${requirement.name} #${index + 1} ${requirement.detail}: ${value || "missing"}`,
        );
      }
    }
  }
  addCheck(
    "Submission draft links are verified public URLs",
    invalidLinks.length === 0,
    invalidLinks.join("; ") || "all link values are public URLs",
  );

  const placeholders = unique(
    [...content.matchAll(/<verified [^>]+>/g)].map((match) => match[0]),
  );
  addCheck(
    "Verified-link placeholders have been replaced",
    placeholders.length === 0,
    placeholders.length ? `remaining: ${placeholders.join(", ")}` : "no placeholders remain",
  );

  const forbiddenClaims = [
    /submitted to #g4hackathon/i,
    /demo video is live/i,
    /deployed to vercel/i,
    /production is verified/i,
  ];
  const matchedClaims = forbiddenClaims
    .map((pattern) => content.match(pattern)?.[0])
    .filter(Boolean);
  addCheck(
    "Runbook does not claim completed external submission",
    matchedClaims.length === 0,
    matchedClaims.length ? `matched: ${matchedClaims.join(", ")}` : "no premature completion claims",
  );

  const localOnlyLinks = [...content.matchAll(/\bhttps?:\/\/(?:localhost|127\.0\.0\.1)[^\s)]+/g)].map(
    (match) => match[0],
  );
  addCheck(
    "Submission drafts do not use local-only URLs",
    localOnlyLinks.length === 0,
    localOnlyLinks.length ? `local URLs: ${unique(localOnlyLinks).join(", ")}` : "no local-only URLs",
  );
}

for (const check of checks) {
  const marker = check.ok ? "PASS" : "FAIL";
  const suffix = check.detail ? ` - ${check.detail}` : "";
  console.log(`${marker} ${check.name}${suffix}`);
}

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error(`\n${failed.length} submission readiness check(s) failed.`);
  process.exit(1);
}

console.log("\nAll submission readiness checks passed.");
