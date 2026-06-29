"use client";

import { AlertTriangle, CheckCircle2, CircleDashed } from "lucide-react";
import type { FinalIncidentPackage } from "@/lib/cerebras/schemas";
import {
  buildIncidentTimeline,
  type TimelineEvent,
} from "@/lib/timeline/incident-timeline";

type IncidentTimelineProps = {
  result: FinalIncidentPackage;
};

function statusStyle(status: TimelineEvent["status"]) {
  if (status === "complete") {
    return {
      icon: <CheckCircle2 size={16} aria-hidden="true" />,
      className: "border-[#b8d9d4] bg-[#effaf8] text-[#155e57]",
    };
  }

  if (status === "failed") {
    return {
      icon: <AlertTriangle size={16} aria-hidden="true" />,
      className: "border-[#f0b89d] bg-[#fff4ed] text-[#9a3412]",
    };
  }

  return {
    icon: <CircleDashed size={16} aria-hidden="true" />,
    className: "border-[#d6d1bf] bg-[#fbfaf5] text-[#625d52]",
  };
}

function laneLabel(lane: TimelineEvent["lane"]) {
  if (lane === "evidence") {
    return "Evidence";
  }

  if (lane === "agent") {
    return "Agent";
  }

  return "Output";
}

export function IncidentTimeline({ result }: IncidentTimelineProps) {
  const events = buildIncidentTimeline(result);

  return (
    <section className="rounded border border-[#d6d1bf] bg-white p-5">
      <div>
        <h2 className="text-lg font-semibold">Incident Timeline</h2>
        <p className="mt-1 text-sm text-[#625d52]">
          Activity feed reconstructed from submitted evidence, agent runs, and
          generated outputs.
        </p>
      </div>

      <ol className="mt-5 grid gap-3">
        {events.map((event) => {
          const style = statusStyle(event.status);

          return (
            <li
              key={event.id}
              className="grid gap-3 rounded border border-[#e2decf] bg-[#fbfaf5] p-3 md:grid-cols-[10rem_1fr]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-semibold ${style.className}`}
                >
                  {style.icon}
                  {event.status}
                </span>
                <span className="font-mono text-xs uppercase text-[#625d52]">
                  {laneLabel(event.lane)}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[#161616]">
                  {event.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-[#4f4a40]">
                  {event.detail}
                </p>
                <p className="mt-2 font-mono text-xs text-[#625d52]">
                  {event.meta}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
