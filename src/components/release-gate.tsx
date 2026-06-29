import { ShieldAlert } from "lucide-react";
import type { ReleaseRiskOutput } from "@/lib/cerebras/schemas";

type ReleaseGateProps = {
  release: ReleaseRiskOutput | null;
};

function gateClass(gate: ReleaseRiskOutput["release_gate"]) {
  if (gate === "PASS") {
    return "border-[#b8d9d4] bg-[#effaf8] text-[#155e57]";
  }

  if (gate === "WARN") {
    return "border-[#f4d58d] bg-[#fff8df] text-[#8a5b00]";
  }

  return "border-[#f0b89d] bg-[#fff4ed] text-[#9a3412]";
}

export function ReleaseGate({ release }: ReleaseGateProps) {
  if (!release) {
    return (
      <div className="rounded border border-[#d6d1bf] bg-[#fbfaf5] p-4 text-sm text-[#625d52]">
        Release gate output is unavailable until the release agent completes.
      </div>
    );
  }

  return (
    <section className={`rounded border p-4 ${gateClass(release.release_gate)}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-semibold">
          <ShieldAlert size={18} aria-hidden="true" />
          Release Gate: {release.release_gate}
        </div>
        <div className="font-mono text-sm">Risk {release.risk_score}/100</div>
      </div>
      <p className="mt-3 text-sm leading-6">{release.reason}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <ListBlock title="Must fix" items={release.must_fix_before_release} />
        <ListBlock title="Recommended tests" items={release.recommended_tests} />
      </div>
    </section>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-2 grid gap-2 text-sm">
        {items.map((item) => (
          <li key={item} className="rounded bg-white/55 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
