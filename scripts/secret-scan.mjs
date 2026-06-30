#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

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

function scanFile(file, label = file) {
  let content;

  try {
    content = readFileSync(file, "utf8");
  } catch {
    return;
  }

  for (const { name, pattern } of secretPatterns) {
    pattern.lastIndex = 0;
    for (const match of content.matchAll(pattern)) {
      findings.push({
        file: label,
        line: lineNumberFor(content, match.index ?? 0),
        name,
      });
    }
  }
}

function listStaticFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }

  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...listStaticFiles(path));
    } else if (/\.(js|css|html|json|txt|map)$/.test(path)) {
      files.push(path);
    }
  }

  return files;
}

for (const file of trackedFiles()) {
  scanFile(file);
}

for (const file of listStaticFiles(".next/static")) {
  scanFile(file, file);
}

if (findings.length > 0) {
  console.error("Secret scan failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.name}`);
  }
  process.exit(1);
}

console.log("Secret scan passed: no tracked or built client secret patterns found.");
