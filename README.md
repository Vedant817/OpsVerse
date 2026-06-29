# OpsVerse

Multimodal Incident Swarm for Enterprise Apps.

OpsVerse turns a bug screenshot, screen recording frames, logs, API responses, DB snapshots, and Git diffs into a complete incident report, root-cause hypothesis, reproduction steps, regression tests, and release-risk decision using a swarm of Gemma 4 agents running on Cerebras.

The runtime path uses Next.js API routes, structured schemas, server-side Cerebras calls, optional Supabase persistence, and visible per-agent failure states.

## Hackathon Positioning

- Primary: Track 1, Multiverse Agents.
- Secondary: Track 3, Enterprise Impact.
- Optional: Track 2, People's Choice, only after a verified demo video exists.

The project is built for Gemma 4 31B on Cerebras. The current `.env.example` uses `CEREBRAS_MODEL=gemma-4-31b`; if the provider returns `404 status code (no body)`, check model availability and account access in the Cerebras model catalog before claiming live model success.

## What Works Now

- Load three synthetic incident samples.
- Upload PNG, JPEG, or WebP screenshot/frame evidence up to 2MB.
- Reject full video files clearly instead of pretending frame extraction exists.
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
Regression Test Agent
  |
  v
Release Risk Agent
  |
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
CEREBRAS_API_KEY=your-server-side-key
CEREBRAS_BASE_URL=https://api.cerebras.ai/v1
CEREBRAS_MODEL=gemma-4-31b

NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

BASELINE_PROVIDER_ENABLED=false
GEMINI_API_KEY=
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
npm audit --audit-level=moderate
```

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
5. Review Summary, Root Cause, Evidence, Tests, Jira Bug, Release Gate, and Speed Metrics tabs.

If the Cerebras model call fails, the UI displays failed agents and provider errors. That is expected until the configured model is available for the account.

## Security Notes

- Do not commit `.env.local`.
- Do not put real customer screenshots, logs, API payloads, DB rows, or private incidents into the repo.
- `CEREBRAS_API_KEY` never goes to the browser bundle.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only.
- Speed metrics are shown only from completed provider responses.
- Demo/mock output must be explicitly labeled if added later.

## Current Known Blockers

- `gemma-4-31b` currently returns provider `404 status code (no body)` in local testing. The app handles this correctly with failed-agent states. Do not claim live Gemma 4 success until a real provider call succeeds.
- Supabase persistence is implemented but live insert/select refresh is not verified until valid Supabase environment variables are configured.
- Deployment, demo video, live app link, and submission links are intentionally absent until verified.

## Future Scope

- Real frame extraction from videos.
- GitHub PR diff analyzer.
- PDF incident report export.
- Slack-style incident timeline.
- Optional baseline comparison with Gemini when explicitly configured.
- Follow-up chat over the incident evidence.
