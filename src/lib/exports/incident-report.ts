import type { FinalIncidentPackage } from "@/lib/cerebras/schemas";
import { analyzePrDiff } from "@/lib/diff/pr-diff-analysis";

const unavailable = "Unavailable: responsible agent did not complete successfully.";

function valueOrUnavailable(value: string | null | undefined) {
  return value?.trim() ? value.trim() : unavailable;
}

function listOrUnavailable(items: string[] | null | undefined) {
  return items && items.length > 0
    ? items.map((item) => `- ${item}`).join("\n")
    : `- ${unavailable}`;
}

function escapeMarkdownCell(value: string) {
  return value.replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

export function incidentReportSlug(result: FinalIncidentPackage) {
  const base = `${result.incident.module}-${result.incident.title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return base || "opsverse-incident-report";
}

export function buildJiraMarkdown(result: FinalIncidentPackage) {
  const { incident, outputs } = result;
  const impact =
    outputs.api?.likely_impact ||
    outputs.rca?.root_cause_summary ||
    "Impact pending completed RCA output.";
  const actual =
    outputs.api?.contract_violation ||
    outputs.logs?.primary_error ||
    "Actual result pending completed agent output.";
  const expected =
    outputs.api?.suggested_fix ||
    "Expected result should be confirmed after RCA and regression agent output.";
  const evidence = [
    outputs.logs?.probable_cause,
    outputs.api?.breaking_field,
    outputs.db?.data_issue,
  ].filter((item): item is string => Boolean(item));

  return [
    `# ${incident.title}`,
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| Module | ${escapeMarkdownCell(incident.module)} |`,
    "| Severity | High |",
    `| Business impact | ${escapeMarkdownCell(impact)} |`,
    `| Expected result | ${escapeMarkdownCell(expected)} |`,
    `| Actual result | ${escapeMarkdownCell(actual)} |`,
    `| Evidence summary | ${escapeMarkdownCell(
      evidence.length > 0
        ? evidence.join(" | ")
        : "No completed evidence-agent output yet.",
    )} |`,
  ].join("\n");
}

export function buildIncidentReportMarkdown(result: FinalIncidentPackage) {
  const { incident, outputs, agent_runs: agentRuns } = result;
  const rca = outputs.rca;
  const tests = outputs.tests;
  const release = outputs.release;
  const prDiff = analyzePrDiff(incident.gitDiff);
  const metricsRows = agentRuns.map((run) =>
    [
      run.agent_name,
      run.status,
      run.metrics ? String(run.metrics.latencyMs) : "n/a",
      run.metrics?.tokensPerSecond == null
        ? "n/a"
        : String(Math.round(run.metrics.tokensPerSecond)),
      run.error ?? "",
    ]
      .map(escapeMarkdownCell)
      .join(" | "),
  );

  return [
    `# OpsVerse Incident Report: ${incident.title}`,
    "",
    "## Summary",
    "",
    `- Module: ${incident.module}`,
    `- Confidence: ${
      typeof rca?.confidence === "number"
        ? `${Math.round(rca.confidence * 100)}%`
        : "n/a"
    }`,
    `- Root cause summary: ${valueOrUnavailable(rca?.root_cause_summary)}`,
    "",
    "## Root-Cause Hypotheses",
    "",
    rca?.hypotheses && rca.hypotheses.length > 0
      ? rca.hypotheses
          .map(
            (item) =>
              `- ${Math.round(item.confidence * 100)}%: ${item.hypothesis}`,
          )
          .join("\n")
      : `- ${unavailable}`,
    "",
    "## Regression Tests",
    "",
    "### Manual QA Steps",
    "",
    listOrUnavailable(tests?.manual_qa_steps),
    "",
    "### SQL Validation",
    "",
    listOrUnavailable(tests?.sql_validation ?? outputs.db?.sql_checks),
    "",
    "### API Regression Test",
    "",
    "```text",
    valueOrUnavailable(tests?.api_regression_test),
    "```",
    "",
    "### Karate Test",
    "",
    "```gherkin",
    valueOrUnavailable(tests?.karate_test),
    "```",
    "",
    "## Jira-Ready Bug",
    "",
    buildJiraMarkdown(result),
    "",
    "## Release Gate",
    "",
    release
      ? [
          `- Decision: ${release.release_gate}`,
          `- Risk score: ${release.risk_score}/100`,
          `- Reason: ${release.reason}`,
          "- Must fix before release:",
          listOrUnavailable(release.must_fix_before_release),
          "- Recommended tests:",
          listOrUnavailable(release.recommended_tests),
        ].join("\n")
      : `- ${unavailable}`,
    "",
    "## Agent Metrics",
    "",
    "| Agent | Status | Latency ms | Tokens/sec | Error |",
    "| --- | --- | ---: | ---: | --- |",
    metricsRows.length > 0 ? metricsRows.map((row) => `| ${row} |`).join("\n") : "| n/a | n/a | n/a | n/a | n/a |",
    "",
    "## PR Diff Analysis",
    "",
    `- Summary: ${prDiff.summary}`,
    `- Files: ${prDiff.files.length > 0 ? prDiff.files.join(", ") : "n/a"}`,
    `- Changed fields: ${
      prDiff.changedFields.length > 0 ? prDiff.changedFields.join(", ") : "n/a"
    }`,
    "",
    "### PR Diff Risks",
    "",
    prDiff.risks.length > 0
      ? prDiff.risks
          .map(
            (risk) =>
              `- ${risk.severity.toUpperCase()}: ${risk.title}. ${risk.evidence} Recommendation: ${risk.recommendation}`,
          )
          .join("\n")
      : "- No risky pattern detected in the supplied diff.",
    "",
    "### PR Diff Regression Checks",
    "",
    listOrUnavailable(prDiff.recommendedTests),
    "",
    "## Evidence",
    "",
    "### Logs",
    "",
    "```text",
    incident.logs,
    "```",
    "",
    "### API Response",
    "",
    "```json",
    incident.apiResponse,
    "```",
    "",
    "### DB Snapshot",
    "",
    "```text",
    incident.dbSnapshot,
    "```",
    "",
    "### Git Diff",
    "",
    "```diff",
    incident.gitDiff || "No git diff supplied.",
    "```",
  ].join("\n");
}

function sanitizePdfText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E\n]/g, "")
    .replace(/\t/g, "  ");
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapPdfLine(line: string, width = 92) {
  const words = line.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!word) {
      continue;
    }

    if (word.length > width) {
      if (current) {
        lines.push(current);
        current = "";
      }
      for (let index = 0; index < word.length; index += width) {
        lines.push(word.slice(index, index + width));
      }
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > width) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [""];
}

function pdfPageStream(lines: string[]) {
  const textCommands = lines
    .map((line, index) => {
      const y = 760 - index * 14;
      return `BT /F1 9 Tf 48 ${y} Td (${escapePdfText(line)}) Tj ET`;
    })
    .join("\n");

  return `${textCommands}\n`;
}

export function buildIncidentReportPdf(result: FinalIncidentPackage) {
  const markdown = sanitizePdfText(buildIncidentReportMarkdown(result));
  const wrappedLines = markdown
    .split("\n")
    .flatMap((line) => wrapPdfLine(line));
  const maxLinesPerPage = 52;
  const pages: string[][] = [];

  for (let index = 0; index < wrappedLines.length; index += maxLinesPerPage) {
    pages.push(wrappedLines.slice(index, index + maxLinesPerPage));
  }

  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  const pageObjectIds = pages.map((_, index) => 3 + index * 2);
  objects.push(
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  );

  pages.forEach((pageLines, index) => {
    const pageObjectId = 3 + index * 2;
    const contentObjectId = pageObjectId + 1;
    const stream = pdfPageStream(pageLines);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentObjectId} 0 R >>`,
    );
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}
