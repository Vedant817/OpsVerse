import type { FinalIncidentPackage } from "@/lib/cerebras/schemas";
import { analyzePrDiff } from "@/lib/diff/pr-diff-analysis";
import { retrieveRunbookMatchesForPackage } from "@/lib/runbook/synthetic-runbook";

export type EvidenceChatSource = {
  label: string;
  excerpt: string;
  score: number;
};

export type EvidenceChatAnswer = {
  ok: boolean;
  question: string;
  answer: string;
  sources: EvidenceChatSource[];
  suggestions: string[];
};

const stopWords = new Set([
  "what",
  "where",
  "when",
  "which",
  "should",
  "about",
  "from",
  "with",
  "this",
  "that",
  "does",
  "have",
  "show",
  "tell",
  "give",
  "need",
  "user",
  "issue",
  "incident",
  "customer",
  "browser",
  "extension",
  "list",
]);

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_.*[\]/:-]+/g, " ");
}

function tokens(value: string) {
  return normalize(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !stopWords.has(token));
}

function excerpt(value: string, maxLength = 280) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > maxLength
    ? `${compact.slice(0, maxLength - 3).trim()}...`
    : compact;
}

function scoreText(text: string, queryTokens: string[]) {
  const normalized = normalize(text);
  return queryTokens.reduce(
    (score, token) => score + (normalized.includes(token) ? 1 : 0),
    0,
  );
}

function source(label: string, value: string): EvidenceChatSource | null {
  if (!value.trim()) {
    return null;
  }

  return {
    label,
    excerpt: excerpt(value),
    score: 0,
  };
}

function outputSources(result: FinalIncidentPackage) {
  const { incident, outputs } = result;
  const prDiff = analyzePrDiff(incident.gitDiff);
  const runbookMatches = retrieveRunbookMatchesForPackage(result);
  const sources: Array<EvidenceChatSource | null> = [
    source("Incident title", `${incident.title} | ${incident.module}`),
    source("Screenshot / frame note", incident.screenshotNote || incident.videoNote),
    source("Backend logs", incident.logs),
    source("API response", incident.apiResponse),
    source("DB snapshot", incident.dbSnapshot),
    source("Git diff", incident.gitDiff),
    source("Vision output", outputs.vision ? JSON.stringify(outputs.vision) : ""),
    source("Log agent output", outputs.logs ? JSON.stringify(outputs.logs) : ""),
    source("API agent output", outputs.api ? JSON.stringify(outputs.api) : ""),
    source("DB agent output", outputs.db ? JSON.stringify(outputs.db) : ""),
    source("RCA output", outputs.rca ? JSON.stringify(outputs.rca) : ""),
    source("Regression test output", outputs.tests ? JSON.stringify(outputs.tests) : ""),
    source("Release output", outputs.release ? JSON.stringify(outputs.release) : ""),
    source(
      "PR diff analysis",
      prDiff.supplied
        ? [
            prDiff.summary,
            ...prDiff.risks.map((risk) => `${risk.title}: ${risk.evidence}`),
            ...prDiff.recommendedTests,
          ].join("\n")
        : "",
    ),
    source(
      "Synthetic runbook",
      runbookMatches
        .map(
          (match) =>
            `${match.title}. ${match.reason} Diagnostics: ${match.diagnosticChecks.join(" ")} Remediation: ${match.remediationSteps.join(" ")}`,
        )
        .join("\n"),
    ),
  ];

  return sources.filter((item): item is EvidenceChatSource => Boolean(item));
}

function intentBoost(label: string, question: string) {
  const normalized = normalize(question);
  if (/sql|query|database|db|stock|table/.test(normalized) && /DB|SQL/i.test(label)) {
    return 3;
  }

  if (/test|qa|postman|karate|regression/.test(normalized) && /test/i.test(label)) {
    return 3;
  }

  if (/release|gate|block|risk|ship/.test(normalized) && /Release/i.test(label)) {
    return 3;
  }

  if (/root|cause|hypothesis|why/.test(normalized) && /RCA|Log|API|DB|diff|runbook/i.test(label)) {
    return 2;
  }

  if (/screenshot|visible|screen|ui|frontend/.test(normalized) && /Screenshot|Vision/i.test(label)) {
    return 2;
  }

  return 0;
}

function rankedSources(result: FinalIncidentPackage, question: string) {
  const queryTokens = tokens(question);
  if (queryTokens.length === 0) {
    return [];
  }

  return outputSources(result)
    .map((item) => ({
      ...item,
      score:
        scoreText(`${item.label} ${item.excerpt}`, queryTokens) +
        intentBoost(item.label, question),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, 4);
}

function answerLead(question: string) {
  const normalized = normalize(question);

  if (/release|gate|block|risk|ship/.test(normalized)) {
    return "Release guidance from the supplied package:";
  }

  if (/sql|query|database|db|stock|table/.test(normalized)) {
    return "Database guidance from the supplied evidence:";
  }

  if (/test|qa|postman|karate|regression/.test(normalized)) {
    return "Regression guidance from the supplied package:";
  }

  if (/root|cause|hypothesis|why/.test(normalized)) {
    return "Root-cause evidence from the supplied package:";
  }

  return "Grounded answer from the supplied incident package:";
}

export const defaultFollowUpQuestions = [
  "What is the likely root cause?",
  "Which SQL checks should I run?",
  "What should block the release?",
  "Which regression tests should be added?",
];

export function answerIncidentQuestion(
  result: FinalIncidentPackage,
  question: string,
): EvidenceChatAnswer {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) {
    return {
      ok: false,
      question: "",
      answer: "Ask a question about the supplied incident evidence.",
      sources: [],
      suggestions: defaultFollowUpQuestions,
    };
  }

  const sources = rankedSources(result, trimmedQuestion);
  if (sources.length === 0 || sources[0].score < 2) {
    return {
      ok: false,
      question: trimmedQuestion,
      answer:
        "I could not find direct support for that question in the supplied evidence or completed agent outputs. Add the missing artifact or ask about logs, API response, DB snapshot, diff, tests, release gate, or runbook matches.",
      sources: [],
      suggestions: defaultFollowUpQuestions,
    };
  }

  return {
    ok: true,
    question: trimmedQuestion,
    answer: [
      answerLead(trimmedQuestion),
      ...sources.map((item) => `- ${item.label}: ${item.excerpt}`),
    ].join("\n"),
    sources,
    suggestions: defaultFollowUpQuestions.filter(
      (suggestion) => suggestion !== trimmedQuestion,
    ),
  };
}
