"use client";

import { Boxes, Network, Play, ShieldAlert, Upload } from "lucide-react";

type HeroProps = {
  architectureVisible: boolean;
  onRunDemo: () => void;
  onUploadEvidence: () => void;
  onToggleArchitecture: () => void;
};

const featureCards = [
  ["Multimodal RCA", "Screenshot, logs, API, DB, diff"],
  ["Agent Swarm", "Vision, Log, API, DB, RCA, Test, Release"],
  ["Release-Ready Output", "Jira, SQL, regression tests, gate"],
] as const;

export function Hero({
  architectureVisible,
  onRunDemo,
  onUploadEvidence,
  onToggleArchitecture,
}: HeroProps) {
  return (
    <section className="border-b border-[#d9d7c9] bg-[#111111] text-[#f7f7f2]">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 md:grid-cols-[minmax(0,1fr)_360px] md:px-8">
        <div className="space-y-7">
          <div className="flex flex-wrap items-center gap-3 text-sm text-[#d8d6c8]">
            <span className="inline-flex items-center gap-2 rounded border border-[#4c4b45] px-3 py-1">
              <Network size={16} aria-hidden="true" />
              Gemma 4 on Cerebras
            </span>
            <span className="inline-flex items-center gap-2 rounded border border-[#4c4b45] px-3 py-1">
              <ShieldAlert size={16} aria-hidden="true" />
              Synthetic evidence only
            </span>
          </div>

          <div className="max-w-4xl space-y-4">
            <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
              OpsVerse - Multimodal Incident Swarm for Enterprise Apps
            </h1>
            <p className="max-w-3xl text-base leading-7 text-[#c9c6ba]">
              OpsVerse turns a bug screenshot, screen recording frames, logs,
              API responses, DB snapshots, and Git diffs into a complete
              incident report, root-cause hypothesis, reproduction steps,
              regression tests, and release-risk decision using a swarm of Gemma
              4 agents running on Cerebras.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onRunDemo}
              className="inline-flex h-11 items-center gap-2 rounded bg-[#f4c95d] px-4 text-sm font-semibold text-[#15120a] transition hover:bg-[#ffd86f]"
            >
              <Play size={17} aria-hidden="true" />
              Run Demo Incident
            </button>
            <button
              type="button"
              onClick={onUploadEvidence}
              className="inline-flex h-11 items-center gap-2 rounded border border-[#6b6a61] px-4 text-sm font-semibold text-[#f7f7f2] transition hover:bg-[#202020]"
            >
              <Upload size={17} aria-hidden="true" />
              Upload Evidence
            </button>
            <button
              type="button"
              onClick={onToggleArchitecture}
              aria-pressed={architectureVisible}
              className="inline-flex h-11 items-center gap-2 rounded border border-[#6b6a61] px-4 text-sm font-semibold text-[#f7f7f2] transition hover:bg-[#202020]"
            >
              <Boxes size={17} aria-hidden="true" />
              View Architecture
            </button>
          </div>
        </div>

        <div className="grid gap-3 self-end">
          {featureCards.map(([title, detail]) => (
            <div
              key={title}
              className="rounded border border-[#3d3c37] bg-[#1b1b1a] p-4"
            >
              <p className="text-sm font-semibold text-[#f7f7f2]">{title}</p>
              <p className="mt-1 text-sm text-[#b9b6aa]">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
