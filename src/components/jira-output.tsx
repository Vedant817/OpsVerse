"use client";

import { ClipboardCopy } from "lucide-react";
import type { FinalIncidentPackage } from "@/lib/cerebras/schemas";

type JiraOutputProps = {
  result: FinalIncidentPackage;
  onCopy: (label: string, value: string) => void;
};

export function jiraText(result: FinalIncidentPackage) {
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
  ].filter(Boolean);

  return [
    `Title: ${incident.title}`,
    `Module: ${incident.module}`,
    "Severity: High",
    `Business impact: ${impact}`,
    `Expected result: ${expected}`,
    `Actual result: ${actual}`,
    `Evidence summary: ${evidence.length > 0 ? evidence.join(" | ") : "No completed evidence-agent output yet."}`,
  ].join("\n");
}

export function JiraOutput({ result, onCopy }: JiraOutputProps) {
  const text = jiraText(result);

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Jira-ready Bug</h3>
          <p className="mt-1 text-sm text-[#625d52]">
            Built from the current incident package. Missing agent output remains
            explicit.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onCopy("Jira Bug", text)}
          className="inline-flex h-10 items-center gap-2 rounded border border-[#d6d1bf] px-3 text-sm font-semibold hover:bg-[#f5f2e8]"
        >
          <ClipboardCopy size={16} aria-hidden="true" />
          Copy Jira Bug
        </button>
      </div>
      <pre className="max-h-96 overflow-auto rounded border border-[#e2decf] bg-[#fbfaf5] p-4 text-sm leading-6 whitespace-pre-wrap text-[#161616]">
        {text}
      </pre>
    </section>
  );
}
