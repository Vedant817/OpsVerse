"use client";

import { AlertTriangle, CheckCircle2, FileCode2 } from "lucide-react";
import type { FinalIncidentPackage } from "@/lib/cerebras/schemas";
import { analyzePrDiff, type PrDiffRisk } from "@/lib/diff/pr-diff-analysis";

type PrDiffAnalysisProps = {
  result: FinalIncidentPackage;
};

function riskClass(severity: PrDiffRisk["severity"]) {
  if (severity === "high") {
    return "border-[#f0b89d] bg-[#fff4ed] text-[#9a3412]";
  }

  if (severity === "medium") {
    return "border-[#f4d58d] bg-[#fff8df] text-[#8a5b00]";
  }

  return "border-[#b8d9d4] bg-[#effaf8] text-[#155e57]";
}

export function PrDiffAnalysis({ result }: PrDiffAnalysisProps) {
  const analysis = analyzePrDiff(result.incident.gitDiff);

  if (!analysis.supplied) {
    return (
      <div className="rounded border border-[#d6d1bf] bg-[#fbfaf5] p-4 text-sm text-[#625d52]">
        PR diff analysis is unavailable because no Git diff evidence was
        supplied.
      </div>
    );
  }

  return (
    <section className="grid gap-4">
      <div className="rounded border border-[#d6d1bf] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">PR Diff Analysis</h2>
            <p className="mt-1 text-sm text-[#625d52]">
              Deterministic analysis of supplied Git diff evidence. No GitHub
              API integration is claimed.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded border border-[#d6d1bf] px-3 py-1 text-sm font-semibold text-[#116d6e]">
            <FileCode2 size={16} aria-hidden="true" />
            {analysis.addedLines}+ / {analysis.removedLines}-
          </span>
        </div>

        <p className="mt-4 text-sm leading-6 text-[#4f4a40]">
          {analysis.summary}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListPanel title="Touched files" items={analysis.files} empty="No file paths found in the diff." />
        <ListPanel
          title="Changed fields"
          items={analysis.changedFields}
          empty="No field-level changes detected."
        />
      </div>

      <section className="rounded border border-[#e2decf] bg-[#fbfaf5] p-4">
        <h3 className="text-sm font-semibold">Implementation Risks</h3>
        {analysis.risks.length > 0 ? (
          <div className="mt-3 grid gap-3">
            {analysis.risks.map((risk) => (
              <article
                key={`${risk.title}-${risk.evidence}`}
                className={`rounded border p-3 ${riskClass(risk.severity)}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <AlertTriangle size={16} aria-hidden="true" />
                  <h4 className="text-sm font-semibold">{risk.title}</h4>
                  <span className="font-mono text-xs uppercase">
                    {risk.severity}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6">{risk.evidence}</p>
                <p className="mt-2 text-sm leading-6">
                  {risk.recommendation}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 flex items-center gap-2 text-sm text-[#155e57]">
            <CheckCircle2 size={16} aria-hidden="true" />
            No risky pattern detected in the supplied diff.
          </p>
        )}
      </section>

      <ListPanel
        title="Recommended regression checks"
        items={analysis.recommendedTests}
        empty="No targeted regression checks generated."
      />
    </section>
  );
}

function ListPanel({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className="rounded border border-[#e2decf] bg-[#fbfaf5] p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-3 grid gap-2 text-sm leading-6">
          {items.map((item) => (
            <li key={item} className="rounded bg-white px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[#625d52]">{empty}</p>
      )}
    </div>
  );
}
