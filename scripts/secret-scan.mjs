#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const secretPatterns = [
  {
    name: "Cerebras API key",
    pattern: /csk-[A-Za-z0-9_-]{20,}/g,
  },
  {
    name: "OpenAI-style API key",
    pattern: /sk-[A-Za-z0-9_-]{32,}/g,
  },
  {
    name: "GitHub token",
    pattern: /(ghp|github_pat)_[A-Za-z0-9_]{20,}/g,
  },
  {
    name: "GitLab token",
    pattern: /glpat-[A-Za-z0-9_-]{20,}/g,
  },
  {
    name: "Slack token",
    pattern: /xox[baprs]-[A-Za-z0-9-]{20,}/g,
  },
  {
    name: "non-empty secret env assignment",
    pattern:
      /^[^\S\r\n]*(?:CEREBRAS_API_KEY|SUPABASE_SERVICE_ROLE_KEY|GEMINI_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY)[^\S\r\n]*=[^\S\r\n]*(?!(?:#|$|["']?$|your[-_]?|placeholder|replace-me|<))\S+/gim,
  },
];

function trackedFiles() {
  const output = execFileSync("git", ["ls-files", "-z"], {
    encoding: "utf8",
  });

  return output.split("\0").filter(Boolean);
}

function lineNumberFor(content, index) {
  return content.slice(0, index).split("\n").length;
}

const findings = [];

for (const file of trackedFiles()) {
  let content;

  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  for (const { name, pattern } of secretPatterns) {
    pattern.lastIndex = 0;
    for (const match of content.matchAll(pattern)) {
      findings.push({
        file,
        line: lineNumberFor(content, match.index ?? 0),
        name,
      });
    }
  }
}

if (findings.length > 0) {
  console.error("Secret scan failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.name}`);
  }
  process.exit(1);
}

console.log("Secret scan passed: no tracked secret patterns found.");
