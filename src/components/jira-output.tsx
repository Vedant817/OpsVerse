"use client";

import { ClipboardCopy, Download } from "lucide-react";
import type { FinalIncidentPackage } from "@/lib/cerebras/schemas";
import { buildJiraMarkdown, incidentReportSlug } from "@/lib/exports/incident-report";

type JiraOutputProps = {
  result: FinalIncidentPackage;
  onCopy: (label: string, value: string) => void;
};

function downloadTextFile(fileName: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function JiraOutput({ result, onCopy }: JiraOutputProps) {
  const text = buildJiraMarkdown(result);
  const slug = incidentReportSlug(result);

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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onCopy("Jira Bug", text)}
            className="inline-flex h-10 items-center gap-2 rounded border border-[#d6d1bf] px-3 text-sm font-semibold hover:bg-[#f5f2e8]"
          >
            <ClipboardCopy size={16} aria-hidden="true" />
            Copy Jira Bug
          </button>
          <button
            type="button"
            onClick={() => {
              downloadTextFile(`${slug}-jira.md`, text, "text/markdown");
              onCopy("Jira Markdown", text);
            }}
            className="inline-flex h-10 items-center gap-2 rounded border border-[#d6d1bf] px-3 text-sm font-semibold hover:bg-[#f5f2e8]"
          >
            <Download size={16} aria-hidden="true" />
            Markdown
          </button>
        </div>
      </div>
      <pre className="max-h-96 overflow-auto rounded border border-[#e2decf] bg-[#fbfaf5] p-4 text-sm leading-6 whitespace-pre-wrap text-[#161616]">
        {text}
      </pre>
    </section>
  );
}
