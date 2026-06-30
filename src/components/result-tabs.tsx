"use client";

import {
  ClipboardCopy,
  Database,
  Download,
  FileJson,
  FileText,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import type { FinalIncidentPackage } from "@/lib/cerebras/schemas";
import { FollowUpChat } from "@/components/follow-up-chat";
import { IncidentTimeline } from "@/components/incident-timeline";
import { JiraOutput } from "@/components/jira-output";
import { PrDiffAnalysis } from "@/components/pr-diff-analysis";
import { ReleaseGate } from "@/components/release-gate";
import { RunbookMatches } from "@/components/runbook-matches";
import { SpeedMetrics } from "@/components/speed-metrics";
import {
  buildIncidentReportPdf,
  incidentReportSlug,
} from "@/lib/exports/incident-report";

type ResultTabsProps = {
  result: FinalIncidentPackage;
};

const tabs = [
  "Summary",
  "Root Cause",
  "Evidence",
  "Tests",
  "Jira Bug",
  "Release Gate",
  "Speed Metrics",
  "Timeline",
  "PR Diff",
  "Runbook",
  "Ask",
  "Submission",
] as const;

type TabName = (typeof tabs)[number];

function copyValue(value: string) {
  return navigator.clipboard.writeText(value);
}

function downloadBytesFile(fileName: string, content: Uint8Array, type: string) {
  const bytes = content.buffer.slice(
    content.byteOffset,
    content.byteOffset + content.byteLength,
  ) as ArrayBuffer;
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function CopyButton({
  label,
  value,
  onCopied,
}: {
  label: string;
  value: string;
  onCopied: (label: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={async () => {
        await copyValue(value);
        onCopied(label);
      }}
      className="inline-flex h-10 items-center gap-2 rounded border border-[#d6d1bf] px-3 text-sm font-semibold hover:bg-[#f5f2e8]"
    >
      <ClipboardCopy size={16} aria-hidden="true" />
      Copy {label}
    </button>
  );
}

function EmptyOutput({ label }: { label: string }) {
  return (
    <div className="rounded border border-[#d6d1bf] bg-[#fbfaf5] p-4 text-sm text-[#625d52]">
      {label} is unavailable because the responsible agent has not completed
      successfully.
    </div>
  );
}

function TextBlock({ value }: { value: string }) {
  return (
    <pre className="max-h-96 overflow-auto rounded border border-[#e2decf] bg-[#fbfaf5] p-4 text-sm leading-6 whitespace-pre-wrap text-[#161616]">
      {value}
    </pre>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
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
        <p className="mt-3 text-sm text-[#625d52]">No completed output.</p>
      )}
    </div>
  );
}

export function ResultTabs({ result }: ResultTabsProps) {
  const [activeTab, setActiveTab] = useState<TabName>("Summary");
  const [copiedLabel, setCopiedLabel] = useState("");
  const sqlChecks = result.outputs.db?.sql_checks ?? result.outputs.tests?.sql_validation ?? [];
  const reportSlug = incidentReportSlug(result);
  const karateTest = result.outputs.tests?.karate_test ?? "";
  const releaseText = result.outputs.release
    ? `Release Gate: ${result.outputs.release.release_gate}\nRisk Score: ${result.outputs.release.risk_score}\nReason: ${result.outputs.release.reason}\nMust Fix:\n${result.outputs.release.must_fix_before_release.join("\n")}`
    : "Release gate output unavailable.";

  function onCopied(label: string) {
    setCopiedLabel(label);
    window.setTimeout(() => setCopiedLabel(""), 1600);
  }

  function downloadIncidentPdf() {
    const pdfBytes = buildIncidentReportPdf(result);
    downloadBytesFile(
      `${reportSlug}.pdf`,
      pdfBytes,
      "application/pdf",
    );
    onCopied("Incident PDF");
  }

  return (
    <section className="rounded border border-[#d6d1bf] bg-white">
      <div className="border-b border-[#e2decf] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Result tabs">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`h-10 rounded border px-3 text-sm font-semibold ${
                  activeTab === tab
                    ? "border-[#116d6e] bg-[#e9f7f6] text-[#0d5d5f]"
                    : "border-[#d6d1bf] bg-[#fbfaf5] text-[#4f4a40] hover:border-[#116d6e]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={downloadIncidentPdf}
            className="inline-flex h-10 items-center gap-2 rounded border border-[#d6d1bf] px-3 text-sm font-semibold hover:bg-[#f5f2e8]"
          >
            <Download size={16} aria-hidden="true" />
            PDF
          </button>
        </div>
        {copiedLabel ? (
          <p className="mt-3 text-sm font-semibold text-[#155e57]">
            Copied {copiedLabel}.
          </p>
        ) : null}
      </div>

      <div className="p-5">
        {activeTab === "Summary" ? (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <SummaryMetric label="Issue" value={result.incident.title} />
              <SummaryMetric label="Module" value={result.incident.module} />
              <SummaryMetric
                label="Confidence"
                value={
                  typeof result.outputs.rca?.confidence === "number"
                    ? `${Math.round(result.outputs.rca.confidence * 100)}%`
                    : "n/a"
                }
              />
            </div>
            <div className="rounded border border-[#e2decf] bg-[#fbfaf5] p-4">
              <h3 className="text-sm font-semibold">Incident Summary</h3>
              <p className="mt-3 text-sm leading-6 text-[#4f4a40]">
                {result.outputs.rca?.root_cause_summary ||
                  result.outputs.api?.likely_impact ||
                  "No completed RCA summary yet. The current run details are visible in the agent graph."}
              </p>
            </div>
          </div>
        ) : null}

        {activeTab === "Root Cause" ? (
          result.outputs.rca ? (
            <div className="grid gap-4">
              <TextBlock value={result.outputs.rca.root_cause_summary} />
              <ListBlock
                title="Hypotheses"
                items={result.outputs.rca.hypotheses.map(
                  (item) =>
                    `${Math.round(item.confidence * 100)}% - ${item.hypothesis}`,
                )}
              />
              <ListBlock
                title="Missing Evidence"
                items={result.outputs.rca.missing_evidence}
              />
            </div>
          ) : (
            <EmptyOutput label="Root cause output" />
          )
        ) : null}

        {activeTab === "Evidence" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <EvidencePanel
              icon={<FileText size={17} aria-hidden="true" />}
              label="Logs"
              value={result.incident.logs}
            />
            <EvidencePanel
              icon={<FileJson size={17} aria-hidden="true" />}
              label="API Response"
              value={result.incident.apiResponse}
            />
            <EvidencePanel
              icon={<Database size={17} aria-hidden="true" />}
              label="DB Snapshot"
              value={result.incident.dbSnapshot}
            />
            <EvidencePanel
              icon={<ShieldAlert size={17} aria-hidden="true" />}
              label="Screenshot Understanding"
              value={
                result.outputs.vision
                  ? [
                      `Screen: ${result.outputs.vision.screen_type}`,
                      `Visible error: ${result.outputs.vision.visible_error}`,
                      `UI state: ${result.outputs.vision.ui_state}`,
                      `Affected flow: ${result.outputs.vision.affected_flow}`,
                      `Confidence: ${Math.round(result.outputs.vision.confidence * 100)}%`,
                    ].join("\n")
                  : result.incident.screenshotNote ||
                "No screenshot interpretation output has completed yet."
              }
            />
          </div>
        ) : null}

        {activeTab === "Tests" ? (
          result.outputs.tests ? (
            <div className="grid gap-4">
              <div className="flex flex-wrap gap-2">
                <CopyButton
                  label="SQL Checks"
                  value={sqlChecks.join("\n")}
                  onCopied={onCopied}
                />
                <CopyButton
                  label="Karate Test"
                  value={karateTest}
                  onCopied={onCopied}
                />
              </div>
              <ListBlock
                title="Manual QA Steps"
                items={result.outputs.tests.manual_qa_steps}
              />
              <ListBlock title="SQL Validation" items={sqlChecks} />
              <TextBlock value={result.outputs.tests.karate_test} />
              <ListBlock
                title="Postman Assertions"
                items={result.outputs.tests.postman_assertions}
              />
            </div>
          ) : (
            <EmptyOutput label="Regression test output" />
          )
        ) : null}

        {activeTab === "Jira Bug" ? (
          <JiraOutput result={result} onCopy={onCopied} />
        ) : null}

        {activeTab === "Release Gate" ? (
          <div className="grid gap-4">
            <CopyButton
              label="Release Decision"
              value={releaseText}
              onCopied={onCopied}
            />
            <ReleaseGate release={result.outputs.release} />
          </div>
        ) : null}

        {activeTab === "Speed Metrics" ? (
          <SpeedMetrics agentRuns={result.agent_runs} />
        ) : null}

        {activeTab === "Timeline" ? (
          <IncidentTimeline result={result} />
        ) : null}

        {activeTab === "PR Diff" ? (
          <PrDiffAnalysis result={result} />
        ) : null}

        {activeTab === "Runbook" ? (
          <RunbookMatches result={result} />
        ) : null}

        {activeTab === "Ask" ? (
          <FollowUpChat result={result} />
        ) : null}

        {activeTab === "Submission" ? (
          result.outputs.narrator ? (
            <SubmissionOutput
              narrator={result.outputs.narrator}
              onCopied={onCopied}
            />
          ) : (
            <EmptyOutput label="Demo narrator output" />
          )
        ) : null}
      </div>
    </section>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[#e2decf] bg-[#fbfaf5] p-4">
      <p className="text-xs font-semibold uppercase text-[#625d52]">{label}</p>
      <p className="mt-2 break-words font-mono text-sm text-[#161616]">{value}</p>
    </div>
  );
}

function EvidencePanel({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded border border-[#e2decf] bg-[#fbfaf5] p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {label}
      </h3>
      <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-sm leading-6 text-[#4f4a40]">
        {value || "No evidence supplied."}
      </pre>
    </div>
  );
}

function SubmissionOutput({
  narrator,
  onCopied,
}: {
  narrator: NonNullable<FinalIncidentPackage["outputs"]["narrator"]>;
  onCopied: (label: string) => void;
}) {
  const allCopy = [
    "# 60-second demo script",
    narrator.demo_script,
    "",
    "# Discord Track 1",
    narrator.discord_track_1_post,
    "",
    "# Discord Track 3",
    narrator.discord_track_3_post,
    "",
    "# X/Twitter",
    narrator.x_post,
  ].join("\n");

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <CopyButton label="Submission Kit" value={allCopy} onCopied={onCopied} />
        <CopyButton
          label="Demo Script"
          value={narrator.demo_script}
          onCopied={onCopied}
        />
        <CopyButton
          label="Track 1 Post"
          value={narrator.discord_track_1_post}
          onCopied={onCopied}
        />
        <CopyButton
          label="Track 3 Post"
          value={narrator.discord_track_3_post}
          onCopied={onCopied}
        />
      </div>

      <div className="rounded border border-[#e2decf] bg-[#fffdf8] p-4 text-sm leading-6 text-[#4f4a40]">
        Generated by the Demo Narrator agent from the completed incident
        package. Add live app, GitHub, and demo video links only after those
        artifacts are verified.
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SubmissionPanel label="60-second demo script" value={narrator.demo_script} />
        <SubmissionPanel
          label="Discord Track 1"
          value={narrator.discord_track_1_post}
        />
        <SubmissionPanel
          label="Discord Track 3"
          value={narrator.discord_track_3_post}
        />
        <SubmissionPanel label="X/Twitter" value={narrator.x_post} />
      </div>
    </div>
  );
}

function SubmissionPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[#e2decf] bg-[#fbfaf5] p-4">
      <h3 className="text-sm font-semibold">{label}</h3>
      <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-sm leading-6 text-[#4f4a40]">
        {value}
      </pre>
    </div>
  );
}
