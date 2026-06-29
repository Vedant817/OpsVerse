export type PrDiffRisk = {
  severity: "low" | "medium" | "high";
  title: string;
  evidence: string;
  recommendation: string;
};

export type PrDiffAnalysis = {
  supplied: boolean;
  files: string[];
  addedLines: number;
  removedLines: number;
  changedFields: string[];
  risks: PrDiffRisk[];
  recommendedTests: string[];
  summary: string;
};

const fieldPattern =
  /(?:^|[^\w$])([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)(?:\s*[:=]|\s*\?\?|\s*\|\|)/g;

function unique(values: string[]) {
  return [...new Set(values)];
}

function diffLines(gitDiff: string) {
  return gitDiff
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
}

function extractFiles(lines: string[]) {
  const files: string[] = [];

  for (const line of lines) {
    const diffMatch = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
    if (diffMatch) {
      files.push(diffMatch[2]);
      continue;
    }

    const fileMatch = /^\+\+\+ b\/(.+)$/.exec(line);
    if (fileMatch && fileMatch[1] !== "/dev/null") {
      files.push(fileMatch[1]);
    }
  }

  return unique(files);
}

function codeChangeLines(lines: string[], prefix: "+" | "-") {
  return lines
    .filter((line) => line.startsWith(prefix) && !line.startsWith(`${prefix}${prefix}`))
    .map((line) => line.slice(1).trim());
}

function extractChangedFields(added: string[], removed: string[]) {
  const fields: string[] = [];

  for (const line of [...added, ...removed]) {
    for (const match of line.matchAll(fieldPattern)) {
      const field = match[1];
      if (!["return", "const", "let", "var", "if"].includes(field)) {
        fields.push(field);
      }
    }
  }

  return unique(fields).sort();
}

function fallbackRemoved(removed: string[], added: string[]) {
  const removedFallbacks = removed.filter((line) => /\?\?|\|\|/.test(line));
  if (removedFallbacks.length === 0) {
    return [];
  }

  const addedWithoutFallback = added.filter((line) => !/\?\?|\|\|/.test(line));
  return removedFallbacks
    .map((removedLine) => ({
      removedLine,
      addedLine:
        addedWithoutFallback.find((line) => {
          const [leftSide] = removedLine.split(/[:=]/);
          return leftSide && line.includes(leftSide.trim());
        }) ?? addedWithoutFallback[0] ?? "",
    }))
    .filter((change) => change.addedLine);
}

function nullSensitiveFields(fields: string[]) {
  return fields.filter((field) => /qty|quantity|amount|count|total/i.test(field));
}

function buildRisks(added: string[], removed: string[], fields: string[]) {
  const risks: PrDiffRisk[] = [];

  for (const change of fallbackRemoved(removed, added)) {
    risks.push({
      severity: "high",
      title: "Null/default fallback removed",
      evidence: `Removed: ${change.removedLine}; Added: ${change.addedLine}`,
      recommendation:
        "Restore an explicit default or add validation before this value reaches the summary contract.",
    });
  }

  const sensitive = nullSensitiveFields(fields);
  if (sensitive.length > 0) {
    risks.push({
      severity: risks.length > 0 ? "high" : "medium",
      title: "Quantity-like field changed",
      evidence: `Changed fields: ${sensitive.join(", ")}`,
      recommendation:
        "Add regression coverage for null, zero, and missing values for the changed quantity field.",
    });
  }

  if (added.some((line) => /throw|Error|Validation/i.test(line))) {
    risks.push({
      severity: "medium",
      title: "Validation behavior changed",
      evidence: "Added code references validation or error behavior.",
      recommendation:
        "Verify the UI surfaces the backend validation response instead of leaving the user blocked.",
    });
  }

  return risks;
}

function buildRecommendedTests(fields: string[], risks: PrDiffRisk[]) {
  const tests = new Set<string>();

  if (fields.some((field) => /confirmedQty|confirmed_qty/i.test(field))) {
    tests.add("Cart summary returns 200 when confirmedQty is numeric.");
    tests.add("Cart summary rejects or normalizes null confirmedQty with a visible UI error.");
    tests.add("response.items[*].confirmedQty is always a number in successful summaries.");
  }

  if (risks.some((risk) => risk.title === "Null/default fallback removed")) {
    tests.add("Add a regression case for null source quantity after mapper changes.");
  }

  if (tests.size === 0) {
    tests.add("Run the affected flow with representative valid, empty, and malformed payloads.");
  }

  return [...tests];
}

export function analyzePrDiff(gitDiff: string): PrDiffAnalysis {
  const trimmed = gitDiff.trim();
  if (!trimmed) {
    return {
      supplied: false,
      files: [],
      addedLines: 0,
      removedLines: 0,
      changedFields: [],
      risks: [],
      recommendedTests: [],
      summary: "No Git diff evidence was supplied.",
    };
  }

  const lines = diffLines(trimmed);
  const added = codeChangeLines(lines, "+");
  const removed = codeChangeLines(lines, "-");
  const changedFields = extractChangedFields(added, removed);
  const risks = buildRisks(added, removed, changedFields);
  const recommendedTests = buildRecommendedTests(changedFields, risks);

  return {
    supplied: true,
    files: extractFiles(lines),
    addedLines: added.length,
    removedLines: removed.length,
    changedFields,
    risks,
    recommendedTests,
    summary:
      risks.length > 0
        ? `${risks.length} implementation risk${risks.length === 1 ? "" : "s"} detected from supplied diff evidence.`
        : "No high-risk implementation pattern was detected in the supplied diff evidence.",
  };
}
