import Link from "next/link";
import { AgentGraph } from "@/components/agent-graph";
import { ResultTabs } from "@/components/result-tabs";
import { DatabaseQueryError, loadFullIncidentDashboard } from "@/lib/db/queries";
import { dashboardRecordToFinalPackage } from "@/lib/dashboard/package";
import { isEnvConfigError } from "@/lib/env";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { id } = await params;

  try {
    const record = await loadFullIncidentDashboard(id);
    const result = dashboardRecordToFinalPackage(record);

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
              Incident Dashboard
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#c9c6ba]">
              Persisted incident `{id}` loaded from Supabase. The panels below
              render saved evidence and saved agent outputs only.
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:px-8">
          <AgentGraph result={result} />
          <ResultTabs result={result} />
        </section>
      </main>
    );
  } catch (error) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] px-5 py-8 text-[#161616] md:px-8">
        <section className="mx-auto max-w-3xl rounded border border-[#f0b89d] bg-[#fff4ed] p-5 text-[#9a3412]">
          <h1 className="text-2xl font-semibold">Dashboard unavailable</h1>
          <p className="mt-3 text-sm leading-6">
            {dashboardErrorMessage(error)}
          </p>
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

function dashboardErrorMessage(error: unknown) {
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

  return "The incident dashboard could not be loaded.";
}
