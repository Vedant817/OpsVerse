# OpsVerse

Multimodal Incident Swarm for Enterprise Apps.

OpsVerse turns a bug screenshot, screen recording frames, logs, API responses, DB snapshots, and Git diffs into a complete incident report, root-cause hypothesis, reproduction steps, regression tests, and release-risk decision using a swarm of Gemma 4 agents running on Cerebras.

The runtime path uses Next.js API routes, structured schemas, server-side Cerebras calls, optional Supabase persistence, and visible per-agent failure states.

## Hackathon Positioning

- Primary: Track 1, Multiverse Agents.
- Secondary: Track 3, Enterprise Impact.
- Optional: Track 2, People's Choice, only after a verified demo video exists.

The project is built for Gemma 4 31B on Cerebras. The current `.env.example` uses `CEREBRAS_MODEL=gemma-4-31b`; the runtime status route probes the provider model list and reports when that configured model is unavailable for the current API key before any swarm output is claimed. Non-Gemma Cerebras models are rejected instead of being used as silent fallbacks.

## What Works Now

- Load three synthetic incident samples.
- Upload PNG, JPEG, or WebP screenshot/frame evidence up to 2MB.
- Upload a video file up to 30MB and extract three representative browser-side frames for Vision.
- Run a server-side incident swarm through `/api/agents/run`.
- Stream live agent progress through `/api/agents/stream`.
- Show runtime readiness for Cerebras, Supabase, and public app URL without exposing secrets.
- Execute deterministic Intake plus Vision, Log, API, DB, RCA, Test, Release, and Narrator agent stages.
- Validate model output with Zod schemas and show failed-agent states when provider calls fail.
- Render the agent graph, result tabs, Jira output, release gate, speed metrics, and narrator submission output from route output.
- Persist incidents/evidence/agent runs when Supabase is configured.
- Show a clear dashboard configuration error when Supabase is not configured.

No static RCA/Jira/test/release answer is pasted into the app as if it came from AI. Sample data is synthetic and only seeds the same runtime path used by manual evidence.

## Architecture

```text
Evidence form
  |
  v
/api/agents/run
or /api/agents/stream
  |
  v
Intake Agent
  |
  v
Vision + Log + API + DB agents
  |
  v
RCA Agent
  |
  v
Regression Test Agent + Release Risk Agent
  \  /
   v
Demo Narrator Agent
  |
  v
Result tabs + optional Supabase dashboard
```

Key files:

- `src/components/evidence-uploader.tsx` - sample/manual evidence intake and upload handling.
- `src/app/api/agents/run/route.ts` - main swarm route.
- `src/app/api/agents/stream/route.ts` - live swarm progress stream.
- `src/app/api/runtime/status/route.ts` - server runtime readiness status.
- `src/lib/agents/orchestrator.ts` - dependency flow and failed-agent gating.
- `src/lib/agents/*-agent.ts` - individual agents.
- `src/lib/cerebras/client.ts` - lazy OpenAI-compatible Cerebras client.
- `src/lib/cerebras/schemas.ts` - runtime input/output contracts.
- `src/lib/db/queries.ts` - optional Supabase persistence.
- `src/app/dashboard/[id]/page.tsx` - persisted dashboard route.
- `supabase/schema.sql` - database schema.

## Local Setup

Install dependencies:

```bash
npm install
```

Create local environment values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
CEREBRAS_API_KEY=
CEREBRAS_BASE_URL=https://api.cerebras.ai/v1
CEREBRAS_MODEL=gemma-4-31b
CEREBRAS_REQUEST_TIMEOUT_MS=20000
CEREBRAS_AGENT_CONCURRENCY=1

NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

OPSVERSE_LOCAL_AGENT_MODE=disabled

BASELINE_PROVIDER_ENABLED=false
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash
```

Start the app:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000`.

## Verification Commands

```bash
npm run verify:local
```

Equivalent individual checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run verify:secrets
npm audit --audit-level=moderate
```

Browser smoke check:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
npm run verify:ui
```

The UI check uses local Chrome through the Chrome DevTools Protocol. It verifies `/` and `/incident` at desktop and mobile widths, checks required visible copy, fails on console/runtime errors, and fails on document-level horizontal overflow.

Useful API smoke checks:

```bash
curl -s -i -X POST http://127.0.0.1:3000/api/agents/run \
  -H 'Content-Type: application/json' \
  --data '{"title":"x"}'
```

The invalid payload should return HTTP `400` with field-level issues.

## Supabase

Apply `supabase/schema.sql` to a Supabase project, then set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

`SUPABASE_SERVICE_ROLE_KEY` is used only from server-only modules. If Supabase is missing, incident creation returns HTTP `503` and the dashboard shows a visible configuration error instead of pretending persistence worked.

## Deployment Readiness

The repo includes a Vercel config and a deployment preflight:

```bash
npm run verify:deployment
```

This check verifies the repo-local personal git identity, expected local scripts, required environment variable names, Supabase schema tables, ignored local env/Vercel files, tracked secret hygiene, GitHub CLI availability, Vercel CLI availability, and git remote presence.

Expected setup before a real deployment:

1. Create a GitHub repo and add it as `origin`.
2. Push with the repo-local personal git identity.
3. Install and authenticate the Vercel CLI with `vercel login`.
4. Link the project with `vercel link`.
5. Configure production env vars in Vercel:
   - `CEREBRAS_API_KEY`
   - `CEREBRAS_BASE_URL`
   - `CEREBRAS_MODEL`
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
6. Deploy with `vercel --prod`.
7. Verify the live URL loads and the primary sample reaches the same real swarm route.

Do not add a live URL to this README until the deployed app has been manually verified.

## Demo Flow

1. Click `Run Demo Incident`.
2. Optionally upload a PNG/JPEG/WebP screenshot or representative frame.
3. Click `Run Incident Swarm`.
4. Watch the agent graph update from real route output.
5. Review Summary, Root Cause, Evidence, Tests, Jira Bug, Release Gate, Speed Metrics, Timeline, PR Diff, Runbook, and Ask tabs.

If the Cerebras model call fails, the UI displays failed agents and provider errors. If the configured model is unavailable, `/api/runtime/status` reports the provider's available model IDs and `/api/benchmark` returns HTTP `424`.

For local development only, set `OPSVERSE_LOCAL_AGENT_MODE=enabled` to run the same intake, streaming, graph, results, export, and dashboard UI path with deterministic evidence-derived outputs. The Runtime panel and completion banner label this mode clearly, no Cerebras speed metrics are generated, and it must not be claimed as live Gemma or Cerebras execution.

The recording script, shot list, and submission drafts are in [`docs/demo-and-submission.md`](docs/demo-and-submission.md). That file intentionally uses verified-link placeholders until the live app, GitHub repository, and demo video exist.

Before posting the final submission, run:

```bash
npm run verify:submission
```

This check is expected to fail until the demo video, Vercel production URL, and GitHub repository placeholders in the runbook are replaced with verified public links.

## Security Notes

- Do not commit `.env.local`.
- Do not put real customer screenshots, logs, API payloads, DB rows, or private incidents into the repo.
- `CEREBRAS_API_KEY` never goes to the browser bundle.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only.
- Speed metrics and provider benchmarks are shown only from completed provider responses.
- Gemini baseline comparison is opt-in with `BASELINE_PROVIDER_ENABLED=true`, `GEMINI_API_KEY`, and `GEMINI_MODEL`.
- Local deterministic demo output is opt-in with `OPSVERSE_LOCAL_AGENT_MODE=enabled`, visibly labeled, and excluded from Cerebras speed benchmark persistence.

## Current Known Blockers

- Live `gemma-4-31b` benchmark connectivity is verified through `/api/benchmark`, including latency, token usage, and `time_info`.
- The full live swarm still returns structured failed-agent diagnostics in this environment: the tiny PNG Vision probe receives provider HTTP `400`, and the text agents currently receive provider HTTP `429`. The route now has bounded request timeouts and configurable provider concurrency, so these failures are visible instead of hanging or falling back to fake output.
- Supabase persistence is implemented but live insert/select refresh is not verified until valid Supabase environment variables are configured.
- Deployment, demo video, live app link, and submission links are intentionally absent until verified.

## Future Scope

- Live production deployment and demo recording after provider and hosting credentials are configured.
- Real Jira/GitHub integrations if the MVP needs authenticated external workflow writes later.
