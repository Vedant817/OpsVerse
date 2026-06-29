"use client";

import { BookOpenCheck, SearchCheck } from "lucide-react";
import type { FinalIncidentPackage } from "@/lib/cerebras/schemas";
import { retrieveRunbookMatchesForPackage } from "@/lib/runbook/synthetic-runbook";

type RunbookMatchesProps = {
  result: FinalIncidentPackage;
};

export function RunbookMatches({ result }: RunbookMatchesProps) {
  const matches = retrieveRunbookMatchesForPackage(result);

  if (matches.length === 0) {
    return (
      <div className="rounded border border-[#d6d1bf] bg-[#fbfaf5] p-4 text-sm text-[#625d52]">
        No synthetic runbook entry matched the supplied incident evidence.
      </div>
    );
  }

  return (
    <section className="grid gap-4">
      <div className="rounded border border-[#d6d1bf] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Synthetic Runbook Retrieval</h2>
            <p className="mt-1 text-sm text-[#625d52]">
              Deterministic retrieval over checked-in synthetic runbook entries.
              This is not a live vector database.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded border border-[#d6d1bf] px-3 py-1 text-sm font-semibold text-[#116d6e]">
            <SearchCheck size={16} aria-hidden="true" />
            {matches.length} match{matches.length === 1 ? "" : "es"}
          </span>
        </div>
      </div>

      <div className="grid gap-4">
        {matches.map((match) => (
          <article
            key={match.id}
            className="rounded border border-[#e2decf] bg-[#fbfaf5] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <BookOpenCheck size={17} aria-hidden="true" />
                  {match.title}
                </h3>
                <p className="mt-1 font-mono text-xs uppercase text-[#625d52]">
                  {match.service} | score {match.score}
                </p>
              </div>
              <p className="max-w-xl text-sm leading-6 text-[#4f4a40]">
                {match.reason}
              </p>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <RunbookList title="Symptoms" items={match.symptoms} />
              <RunbookList title="Diagnostic checks" items={match.diagnosticChecks} />
              <RunbookList title="Remediation" items={match.remediationSteps} />
            </div>

            <div className="mt-4 rounded border border-[#d6d1bf] bg-white p-3 text-sm text-[#4f4a40]">
              <span className="font-semibold text-[#161616]">Owner:</span>{" "}
              {match.escalationOwner}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function RunbookList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded border border-[#e2decf] bg-white p-3">
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#4f4a40]">
        {items.map((item) => (
          <li key={item} className="rounded bg-[#fbfaf5] px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
