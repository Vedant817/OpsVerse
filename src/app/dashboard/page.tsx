import Link from "next/link";
import { DatabaseQueryError, listIncidentSummaries } from "@/lib/db/queries";
import { isEnvConfigError } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function DashboardIndexPage() {
  try {
    const incidents = await listIncidentSummaries(25);

    return (
      <main className="min-h-screen bg-[#f7f7f2] text-[#161616]">
        <section className="border-b border-[#d9d7c9] bg-[#111111] text-[#f7f7f2]">
          <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
            <Link
              href="/"
              className="text-sm font-semibold text-[#f4c95d] hover:text-[#ffd86f]"
            >
              Back to intake
            </Link>
            <h1 className="mt-5 text-4xl font-semibold leading-tight">
              Incident History
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#c9c6ba]">
              Recent persisted incidents loaded from Supabase. Each row links to
              the saved dashboard record for that incident.
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-4 px-5 py-6 md:px-8">
          {incidents.length === 0 ? (
            <div className="rounded border border-[#d6d1bf] bg-white p-5">
              <h2 className="text-xl font-semibold">No persisted incidents</h2>
              <p className="mt-2 text-sm leading-6 text-[#625d52]">
                Run an incident with Supabase configured to create a durable
                dashboard entry.
              </p>
            </div>
          ) : (
            incidents.map((item) => (
              <Link
                key={item.incident.id}
                href={`/dashboard/${item.incident.id}`}
                className="grid gap-3 rounded border border-[#d6d1bf] bg-white p-4 transition hover:border-[#116d6e] md:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">
                    {item.incident.title}
                  </p>
                  <p className="mt-1 truncate font-mono text-xs text-[#625d52]">
                    {item.incident.id}
                  </p>
                  <p className="mt-2 text-sm text-[#625d52]">
                    {item.incident.module ?? "unknown module"} ·{" "}
                    {item.incident.created_at}
                  </p>
                </div>
                <dl className="grid grid-cols-4 gap-2 text-xs md:min-w-[26rem]">
                  <div className="rounded border border-[#e2decf] bg-[#fbfaf5] p-3">
                    <dt className="font-semibold text-[#625d52]">Status</dt>
                    <dd className="mt-1 font-mono text-[#111111]">
                      {item.incident.status}
                    </dd>
                  </div>
                  <div className="rounded border border-[#e2decf] bg-[#fbfaf5] p-3">
                    <dt className="font-semibold text-[#625d52]">Runs</dt>
                    <dd className="mt-1 font-mono text-[#111111]">
                      {item.agent_run_count}
                    </dd>
                  </div>
                  <div className="rounded border border-[#e2decf] bg-[#fbfaf5] p-3">
                    <dt className="font-semibold text-[#625d52]">Events</dt>
                    <dd className="mt-1 font-mono text-[#111111]">
                      {item.agent_event_count}
                    </dd>
                  </div>
                  <div className="rounded border border-[#e2decf] bg-[#fbfaf5] p-3">
                    <dt className="font-semibold text-[#625d52]">Benchmarks</dt>
                    <dd className="mt-1 font-mono text-[#111111]">
                      {item.speed_benchmark_count}
                    </dd>
                  </div>
                </dl>
              </Link>
            ))
          )}
        </section>
      </main>
    );
  } catch (error) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] px-5 py-8 text-[#161616] md:px-8">
        <section className="mx-auto max-w-3xl rounded border border-[#f0b89d] bg-[#fff4ed] p-5 text-[#9a3412]">
          <h1 className="text-2xl font-semibold">Incident history unavailable</h1>
          <p className="mt-3 text-sm leading-6">{historyErrorMessage(error)}</p>
          <Link
            href="/"
            className="mt-5 inline-flex h-10 items-center rounded border border-[#f0b89d] px-3 text-sm font-semibold hover:bg-[#ffe7dd]"
          >
            Back to intake
          </Link>
        </section>
      </main>
    );
  }
}

function historyErrorMessage(error: unknown) {
  if (isEnvConfigError(error)) {
    return error.message;
  }

  if (error instanceof DatabaseQueryError) {
    return error.causeDetail
      ? `${error.message} ${error.causeDetail}`
      : error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Incident history could not be loaded.";
}
