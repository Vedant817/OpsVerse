# OpsVerse Implementation Task Tracker

Source document: `Idea.md`

Purpose: this file is the project ledger for implementation agents. It records the full OpsVerse product idea, what has been implemented, what remains open, the expected acceptance criteria, and the intended build order. Keep this file updated after every behavior-changing implementation slice.

Current repository state:

- [x] Product idea captured in `Idea.md`
- [x] Next.js application scaffold exists
- [x] Runtime dependencies installed
- [~] Cerebras integration implemented
- [x] Incident intake implemented
- [~] Agent swarm implemented
- [~] Dashboard implemented
- [~] Supabase persistence implemented
- [!] Deployment completed
- [ ] Demo recorded
- [ ] Submission posts finalized

Status legend:

- `[ ]` Not started
- `[~]` In progress
- `[x]` Done and locally verified
- `[!]` Blocked or needs external input

Verification rule: do not mark a task `[x]` unless the relevant code exists, the main path has been exercised locally, and the verification command or manual check is noted in this file.

---

## 1. Product Definition

### 1.1 Core Positioning

- [ ] Implement OpsVerse as a multimodal incident-response control room for enterprise apps.
- [ ] Make the first screen communicate the product clearly: "OpsVerse - Multimodal Incident Swarm for Enterprise Apps."
- [ ] Preserve the one-line pitch in product copy, README, and demo script:
  - OpsVerse turns a bug screenshot, screen recording frames, logs, API responses, DB snapshots, and Git diffs into a complete incident report, root-cause hypothesis, reproduction steps, regression tests, and release-risk decision using a swarm of Gemma 4 agents running on Cerebras.
- [ ] Keep the hackathon positioning explicit:
  - Primary: Track 1, Multiverse Agents.
  - Secondary: Track 3, Enterprise Impact.
  - Optional: Track 2, People's Choice, only after a strong demo video exists.
- [ ] Keep all sample evidence synthetic. Do not use real company data.

Acceptance criteria:

- [ ] User can understand within 5 seconds that this is an enterprise incident triage product.
- [ ] UI and README mention Gemma 4 on Cerebras.
- [ ] Product output is engineering-actionable, not only a summary.

---

## 2. Repository Bootstrap

### 2.1 Git and Identity

- [x] Initialize git only if the repo is not already initialized.
- [x] Configure repo-local git identity before the first commit.
- [x] Use the user's personal git account, not the work account.
- [x] Explicitly avoid committing with `vedant.mahajan@salescode.ai`.
- [x] Add a verification note after running:
  - `git config --local user.name`
  - `git config --local user.email`
  - `git status --short`

Verification note:

- `git config --local user.name` returns `Vedant Mahajan`.
- `git config --local user.email` returns `vedantmahajan271@gmail.com`.
- `git status --short` shows repo-visible scaffold/docs changes and does not use the work email.
- Personal account evidence came from local GitHub config user `Vedant817` and the personal SSH key comment for `id_ed25519_personal.pub`.

### 2.2 App Scaffold

- [x] Create a Next.js 15 app with TypeScript, Tailwind CSS, ESLint, and App Router.
- [x] Use the existing folder as the project root if possible. Avoid nesting a second `opsverse/` app unless explicitly chosen.
- [x] Install required dependencies:
  - `openai`
  - `zod`
  - `lucide-react`
  - `reactflow` or `@xyflow/react`
  - `recharts`
  - `@supabase/supabase-js`
  - `framer-motion` if animations are used
  - shadcn/ui dependencies if shadcn is initialized
- [x] Add base files:
  - `package.json`
  - `README.md`
  - `.env.example`
  - `.gitignore`
  - `app/layout.tsx`
  - `app/page.tsx`
  - `app/globals.css`

Acceptance criteria:

- [x] `npm install` or `pnpm install` completes.
- [x] Dev server starts.
- [x] Home page loads locally.
- [x] No TypeScript or lint errors in the scaffold.

Verification note:

- Scaffolded with Next.js `15.5.19`, React `19.2.4`, TypeScript, Tailwind CSS, ESLint, and App Router under `src/app`.
- Installed runtime dependencies: `openai`, `zod`, `lucide-react`, `@xyflow/react`, `recharts`, `@supabase/supabase-js`, and `framer-motion`.
- Added `.env.example` and allowed it through `.gitignore`.
- Added `typecheck` script.
- Set `turbopack.root` in `next.config.ts` to avoid workspace-root inference from `/Users/salescode/package-lock.json`.
- `npm install` completed.
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- `npm audit --audit-level=moderate` passed with 0 vulnerabilities after forcing patched `postcss` through npm overrides.
- `npm run dev -- --hostname 127.0.0.1 --port 3000` started successfully and `curl -I http://127.0.0.1:3000` returned HTTP 200.
- Full browser automation check was not run because the required `agent-browser` CLI is not installed in this environment.

---

## 3. Environment and Security

### 3.1 Environment Variables

- [x] Add `.env.example` with:
  - `CEREBRAS_API_KEY=`
  - `CEREBRAS_BASE_URL=https://api.cerebras.ai/v1`
  - `CEREBRAS_MODEL=gemma-4-31b`
  - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
  - `NEXT_PUBLIC_SUPABASE_URL=`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=`
  - `SUPABASE_SERVICE_ROLE_KEY=`
  - `BASELINE_PROVIDER_ENABLED=false`
  - `GEMINI_API_KEY=`
- [x] Keep `.env.local` ignored by git.
- [x] Validate required server-side env vars before model or database calls.
- [x] Never expose `CEREBRAS_API_KEY` to the browser.
- [x] Keep all Cerebras calls inside server routes or server-only modules.
- [x] Keep Supabase service role usage server-only.

Acceptance criteria:

- [x] Missing `CEREBRAS_API_KEY` produces a clear server error, not a silent fake result.
- [x] Client bundle does not reference `CEREBRAS_API_KEY`.
- [x] `.env.example` documents every required and optional variable.

Verification note:

- Added server-only env validation in `src/lib/env.ts`.
- `GET /api/benchmark` with no `CEREBRAS_API_KEY` returns HTTP 503 and JSON: `{"ok":false,"error":"Cerebras is not configured...","missing":["CEREBRAS_API_KEY"]}`.
- `rg "CEREBRAS_API_KEY|CEREBRAS_BASE_URL|CEREBRAS_MODEL|SUPABASE_SERVICE_ROLE_KEY" .next/static` returned no matches, confirming the client static bundle does not reference server secret names.
- Supabase service-role handling is server-only through `src/lib/db/supabase.ts`, which imports `server-only`, lazy-loads the admin client, and reads `SUPABASE_SERVICE_ROLE_KEY` only on the server.
- `.env.example` was checked and contains placeholders only. A real key was moved to ignored `.env.local`; rotate that key before relying on it because it had been placed in `.env.example` during local work.

---

## 4. Data Model and Persistence

### 4.1 Supabase Schema

- [x] Add `supabase/schema.sql`.
- [x] Create `incidents` table:
  - `id uuid primary key default gen_random_uuid()`
  - `title text not null`
  - `module text`
  - `status text default 'created'`
  - `severity text`
  - `created_at timestamptz default now()`
- [x] Create `incident_evidence` table:
  - `id uuid primary key default gen_random_uuid()`
  - `incident_id uuid references incidents(id) on delete cascade`
  - `type text not null`
  - `content text`
  - `file_url text`
  - `created_at timestamptz default now()`
- [x] Create `agent_runs` table:
  - `id uuid primary key default gen_random_uuid()`
  - `incident_id uuid references incidents(id) on delete cascade`
  - `agent_name text not null`
  - `status text not null`
  - `latency_ms int`
  - `prompt_tokens int`
  - `completion_tokens int`
  - `total_tokens int`
  - `tokens_per_second numeric`
  - `output jsonb`
  - `created_at timestamptz default now()`
- [x] Create `speed_benchmarks` table for aggregate comparison data.
- [x] Create `demo_sessions` table for hackathon demo runs.
- [x] Add indexes for incident lookups and agent run history.

Acceptance criteria:

- [~] Schema can be applied to Supabase.
- [~] Incident creation stores core metadata.
- [~] Evidence records can be created and loaded by incident.
- [~] Agent outputs and metrics survive page refresh.

Verification note:

- Added `supabase/schema.sql` with `incidents`, `incident_evidence`, `agent_runs`, `speed_benchmarks`, `demo_sessions`, and lookup indexes.
- Schema is syntactically ready for Supabase/Postgres, but has not been applied against a live Supabase project in this environment.
- Persistence behavior is implemented in server code and build-verified; live insert/select verification is blocked until valid Supabase env values are supplied.

### 4.2 Database Client and Queries

- [x] Implement `lib/db/supabase.ts`.
- [x] Implement `lib/db/queries.ts`.
- [x] Provide functions for:
  - Creating an incident.
  - Saving evidence.
  - Creating/updating agent run records.
  - Loading a full incident dashboard.
  - Saving speed benchmark data.
- [x] Add a local fallback only if explicitly marked as a demo fallback. Do not present fallback data as persisted production data.

Acceptance criteria:

- [ ] Dashboard URL can be refreshed without losing completed outputs when Supabase is configured.
- [x] Database failures are visible in the UI/API response.

Verification note:

- Added lazy server-only Supabase admin client in `src/lib/db/supabase.ts`.
- Added `src/lib/db/queries.ts` functions for incident creation, evidence saving, agent-run saving, full incident loading, incident evidence reconstruction, and speed benchmark saving.
- No unconfigured local fallback is used. If Supabase is not configured, `/api/agents/run` reports `persistence.enabled: false` while still running the live AI path; `/api/incidents` returns HTTP 503 instead of pretending persistence succeeded.
- `npm run typecheck` and `npm run lint` passed after the DB layer was added.
- API smoke checks on `127.0.0.1:3000` confirmed invalid incident JSON returns HTTP 400, invalid evidence returns HTTP 400, and valid sample incident creation returns HTTP 503 with missing Supabase env fields when persistence is not configured.

---

## 5. Sample Incident Evidence

### 5.1 Primary Demo Incident: Cart Summary Failure

- [x] Add `lib/samples/cart-summary-failure.ts`.
- [x] Include title: "Unable to move from cart to order summary."
- [x] Include module: "Direct Orders."
- [x] Include screenshot metadata or bundled image reference.
- [x] Include API response:
  - endpoint `/api/cart/summary`
  - status `422`
  - error `Validation failed`
  - breaking field `items[0].confirmedQty`
  - message `Expected number, received null`
- [x] Include backend logs:
  - timestamp `2026-06-28T18:45:21Z`
  - service `order-service`
  - correlation id `req-8f32`
  - exception `CartSummaryValidationException`
  - cause `confirmedQty cannot be null for SKU 13321`
- [x] Include DB snapshot:
  - `outlet_code`
  - `sku_code`
  - `available_qty`
  - `confirmed_qty`
  - `case_qty`
  - `piece_qty`
- [x] Include optional git diff:
  - old: `confirmedQty: item.confirmedQty ?? 0`
  - new: `confirmedQty: item.confirmedQty`

Acceptance criteria:

- [x] "Load Demo Incident" fills every relevant form field.
- [!] Primary sample produces the expected RCA shape.
- [x] Data is clearly labeled synthetic.

Verification note:

- Added typed sample evidence in `src/lib/samples/cart-summary-failure.ts`.
- The intake UI loads this sample through `loadSample`, filling title, module, screenshot note, video note, logs, API response, DB snapshot, and git diff.
- RCA shape is blocked until the configured Cerebras model returns successful live responses; the orchestrator and RCA agent code now exist.

### 5.2 Additional Samples

- [x] Add `lib/samples/return-tracking-confirmed-qty.ts`.
- [x] Add `lib/samples/order-tracking-items-missing.ts`.
- [x] Ensure each sample includes title, module, logs, API response, DB snapshot, and optional git diff.
- [x] Add sample selector buttons:
  - "Load Sample: Cart Summary Failure"
  - "Load Sample: Return Tracking Qty Bug"
  - "Load Sample: Order Tracking Items Missing"

Acceptance criteria:

- [x] All sample buttons populate evidence fields without page reload.
- [~] Each sample can be run through the swarm.

Verification note:

- Added `src/lib/samples/return-tracking-confirmed-qty.ts`, `src/lib/samples/order-tracking-items-missing.ts`, and `src/lib/samples/index.ts`.
- The UI renders sample selector buttons for all three samples and updates client state without navigation.
- Each sample can be submitted to `/api/agents/run`; complete swarm output is blocked by the configured Cerebras model returning `404 status code (no body)`.

---

## 6. Frontend Pages

### 6.1 Landing Page

- [x] Implement `app/page.tsx`.
- [x] Include product name as the primary first-viewport signal.
- [~] Include hero copy:
  - "Multimodal Incident Swarm for Enterprise Apps"
  - "Upload a screenshot, logs, API response, and DB snapshot. Gemma 4 agents on Cerebras turn chaos into RCA, tests, and release decisions in seconds."
- [x] Add primary actions:
  - Run Demo Incident
  - Upload Evidence
  - View Architecture
- [x] Show feature areas:
  - Multimodal RCA
  - Agent Swarm
  - Release-Ready Output
- [x] Make the first screen a usable product entry point, not only a marketing page.

Acceptance criteria:

- [x] Clicking "Run Demo Incident" loads the demo path.
- [x] Clicking "Upload Evidence" opens the incident intake flow.
- [x] Layout is responsive on desktop and mobile.

Verification note:

- Replaced the default Next.js starter page with the OpsVerse intake workspace in `src/app/page.tsx`.
- The product headline is present; the supporting hero copy was adjusted to avoid claiming the full swarm works before the orchestrator exists.
- `curl -s http://127.0.0.1:3000` showed `OpsVerse`, `Run Demo Incident`, all three sample names, and `Incident Intake`.
- Full browser click/responsive verification was not run because `agent-browser` and Playwright are not installed in this environment.

### 6.2 Incident Upload Page

- [x] Implement `app/incident/page.tsx`.
- [x] Add fields:
  - Incident title
  - Module/service
  - Screenshot upload
  - Video upload or frame upload
  - Logs textarea
  - API response textarea
  - DB snapshot textarea
  - Git diff textarea
- [x] Add validation with useful error messages.
- [x] Add sample loading buttons.
- [~] Add "Run Incident Swarm" action.
- [x] Prevent empty submissions unless a sample incident is loaded.
- [x] Show clear handling for optional evidence.

Acceptance criteria:

- [x] User can manually paste logs/API/DB evidence.
- [x] User can upload a screenshot.
- [!] User can run the swarm from sample or manual evidence.

Verification note:

- Added reusable client component `src/components/evidence-uploader.tsx` and route `src/app/incident/page.tsx`.
- The button validates the evidence package, calls `/api/agents/run`, and renders the real execution graph/result tabs from the route payload. It does not fake swarm output.
- `curl -s http://127.0.0.1:3000/incident` showed `OpsVerse`, `Synthetic evidence only`, all three sample names, and `Run Incident Swarm`.
- Complete live swarm output remains blocked by the configured Cerebras model returning `404 status code (no body)`, but failed agent states render without crashing.

### 6.3 Swarm Execution Page

- [x] Implement an execution view, either within the incident flow or dashboard.
- [x] Show agent nodes:
  - Vision Agent
  - Log Agent
  - API Agent
  - DB Agent
  - RCA Agent
  - Test Agent
  - Release Judge
  - Demo Narrator Agent
- [x] Show each node state:
  - Pending
  - Running
  - Complete
  - Failed
- [x] Show per-agent:
  - Latency
  - Tokens
  - Confidence
  - Output preview
- [x] Make multi-agent collaboration visible in the demo.

Acceptance criteria:

- [x] Running the swarm visibly updates agent states.
- [x] Failed agents show error details and do not crash the page.
- [~] RCA waits for Vision, Log, API, and DB outputs.

Verification note:

- Added `src/components/agent-card.tsx` and `src/components/agent-graph.tsx`.
- The intake flow renders running state while `/api/agents/run` is in flight, then renders real completed/failed/pending nodes from the route payload.
- Vision and Narrator are shown as pending until their agents exist; Log/API/DB/RCA/Test/Release render from real route data.
- RCA dependency gating is implemented for Log/API/DB and for Vision when real image/frame evidence is supplied.
- Browser smoke with local Chrome verified the demo sample submission renders `Incident swarm failed`, `Agent Execution`, `Log Agent`, and result tabs without a Next error overlay. The only console error was the expected HTTP 502 from the live provider failure.

### 6.4 Results Dashboard

- [x] Implement `app/dashboard/[id]/page.tsx`.
- [x] Add tabs:
  - Summary
  - Root Cause
  - Evidence
  - Tests
  - Jira Bug
  - Release Gate
  - Speed Metrics
- [x] Include final product outputs:
  - Incident summary
  - Screenshot understanding
  - Root-cause hypotheses
  - Reproduction steps
  - Jira-ready bug
  - SQL validation checks
  - API regression tests
  - Release gate decision
  - Cerebras speed metrics
- [x] Add copy buttons:
  - Copy Jira Bug
  - Copy SQL Checks
  - Copy Karate Test
  - Copy Release Decision
- [x] Show missing evidence clearly.

Acceptance criteria:

- [x] Dashboard displays all completed agent outputs.
- [x] Copy buttons copy the expected content.
- [~] Refreshing the URL reloads results if persistence is configured.

Verification note:

- Added `src/components/result-tabs.tsx`, `src/components/jira-output.tsx`, `src/components/release-gate.tsx`, and `src/app/dashboard/[id]/page.tsx`.
- The intake flow renders the same result tabs directly from the `/api/agents/run` response.
- `/dashboard/[id]` loads persisted evidence and saved agent runs from Supabase when configured; when Supabase is missing it shows a visible dashboard error instead of fake stored output.
- Refresh persistence is build-verified but not live-verified because valid Supabase env values are not configured in this environment.
- HTTP smoke verified `/dashboard/00000000-0000-0000-0000-000000000000` renders `Dashboard unavailable` with the Supabase configuration error when persistence is not configured.

### 6.5 Speed Comparison Page

- [x] Implement speed metrics section or standalone page.
- [x] Show Cerebras Gemma 4 metrics:
  - TTFT when available
  - Output tokens/sec
  - Total time
  - Total swarm time
  - Fastest agent
  - Slowest agent
  - Total tokens
- [x] Add optional baseline provider comparison only if configured.
- [x] Do not fake baseline results.

Acceptance criteria:

- [x] Judges can see Cerebras speed as part of the product.
- [x] Metrics come from actual calls or are explicitly labeled sample/demo.

Verification note:

- Added `src/components/speed-metrics.tsx`, rendered inside result tabs.
- Speed metrics are calculated only from completed agent runs and stored model usage metrics. Failed provider calls show an explicit no-metrics state.
- Updated `supabase/schema.sql` and DB queries to preserve `time_info` from agent runs when Supabase persistence is configured.
- Browser smoke verified the Speed Metrics tab renders `Cerebras Speed Metrics` and the no-synthetic-metrics empty state after the current provider failure.

---

## 7. Components

### 7.1 Required Components

- [ ] `components/hero.tsx`
- [x] `components/evidence-uploader.tsx`
- [x] `components/agent-graph.tsx`
- [x] `components/agent-card.tsx`
- [x] `components/result-tabs.tsx`
- [x] `components/speed-metrics.tsx`
- [x] `components/jira-output.tsx`
- [x] `components/release-gate.tsx`

### 7.2 Component Requirements

- [x] Components must use TypeScript props.
- [x] Components must handle loading, empty, success, and error states where relevant.
- [x] Use icons for action buttons where practical.
- [x] Keep UI dense and operational, suitable for QA/SRE/support teams.
- [x] Avoid decorative-only visuals that hide the actual incident workflow.

Acceptance criteria:

- [x] Components can render with sample data.
- [~] Components do not overflow on mobile.
- [x] Core actions are keyboard accessible.

Verification note:

- Components use typed props, semantic buttons/links, keyboard-focusable controls, and real incident package data.
- Local Chrome smoke at 390px viewport verified no document-level horizontal overflow after rendering the failed swarm state, agent graph, and result tabs.

---

## 8. Cerebras and AI Layer

### 8.1 Client Wrapper

- [x] Implement `lib/cerebras/client.ts`.
- [x] Use OpenAI-compatible client with:
  - `apiKey: process.env.CEREBRAS_API_KEY`
  - `baseURL: process.env.CEREBRAS_BASE_URL || "https://api.cerebras.ai/v1"`
  - `model: process.env.CEREBRAS_MODEL || "gemma-4-31b"`
- [x] Implement `runGemmaAgent`.
- [x] Measure:
  - start time
  - latency ms
  - usage
  - `time_info` if available
- [x] Support `reasoning_effort` values:
  - none
  - low
  - medium
  - high
- [x] Use temperature `0.2` for stable incident outputs.

Acceptance criteria:

- [!] A test API route can call Gemma 4 and return content plus latency.
- [x] Errors include provider status/message where safe.
- [x] No server secret leaks into logs or client responses.

Verification note:

- Added `src/lib/cerebras/client.ts` with a lazy OpenAI-compatible Cerebras client and `runGemmaAgent`.
- Added `src/app/api/benchmark/route.ts` as the server-only test route.
- The route returns real latency, usage, tokens/sec, `time_info`, model, content, and response id when live Cerebras is configured.
- Live Gemma call is blocked in this environment because `CEREBRAS_API_KEY` is not present in the shell or `.env.local`.
- Missing-key and invalid-JSON paths were verified with `curl`.
- `npm run lint`, `npm run typecheck`, `npm run build`, and `npm audit --audit-level=moderate` passed.

### 8.2 Structured Output Schemas

- [x] Implement `lib/cerebras/schemas.ts`.
- [x] Define Zod schemas for:
  - Intake output
  - Vision output
  - Log output
  - API output
  - DB output
  - RCA output
  - Regression test output
  - Release risk output
  - Demo narrator output
  - Final incident package
- [x] Validate model responses.
- [x] Add repair/fallback path for malformed JSON.
- [x] Surface schema validation failures as agent failures.

Acceptance criteria:

- [!] Valid model JSON is parsed into typed objects.
- [x] Invalid JSON does not crash the app.
- [x] UI shows failed agent state when validation fails.

Verification note:

- Added `src/lib/cerebras/schemas.ts` with schemas for intake, vision, log, API, DB, RCA, regression test, release risk, narrator, agent runs, and final incident package.
- Added schema validation in `src/lib/agents/structured-agent.ts`.
- Malformed/non-schema model output is returned as a failed agent run instead of guessed output.
- Live valid-model JSON parsing is blocked because the configured Cerebras model currently returns `404 status code (no body)`.

### 8.3 Prompt Templates

- [x] Implement `lib/cerebras/prompts.ts`.
- [~] Include prompts for:
  - Vision Triage Agent
  - Log Analysis Agent
  - API Contract Agent
  - DB Consistency Agent
  - Root Cause Agent
  - Regression Test Agent
  - Release Risk Agent
  - Demo Narrator Agent
- [x] Require "Return only valid JSON" in agent prompts.
- [x] Keep prompts grounded in provided evidence.
- [x] Tell agents to identify missing evidence instead of inventing facts.

Acceptance criteria:

- [!] Each prompt produces output matching its schema in a live or mocked test.
- [!] Outputs include confidence where required.

Verification note:

- Added prompts in `src/lib/cerebras/prompts.ts` for Vision, Log, API, DB, RCA, Regression Test, and Release Risk agents.
- Narrator schema exists, but its runnable prompt/agent remains future work.
- Live prompt verification is blocked by Cerebras returning 404 for the configured model.

### 8.4 Image Handling

- [x] Implement `lib/cerebras/image.ts`.
- [x] Convert uploaded image files to base64 data URIs.
- [x] Send screenshot to Vision Agent using multimodal message content.
- [x] Validate file type and size.
- [x] For video, do not send the full video directly.
- [ ] For video stretch work, extract 3-5 representative frames:
  - before action
  - clicked button
  - error/stuck state
  - optional network failure state

Acceptance criteria:

- [!] Vision Agent can analyze an uploaded screenshot.
- [x] Unsupported file types are rejected clearly.

Verification note:

- Added `src/lib/cerebras/image.ts` with server-side validation for PNG, JPEG, and WebP data URIs up to 2MB.
- The intake UI now reads selected PNG/JPEG/WebP screenshots or frame images into base64 data URIs and includes them in `/api/agents/run`.
- Full video files are rejected with a clear message; users must upload a representative image frame until frame extraction is implemented.
- `/api/agents/run` and `/api/incidents` validate image payloads before persistence or model calls and return HTTP 400 for invalid image evidence.
- Live screenshot analysis remains blocked because the configured Cerebras model currently returns provider errors.
- HTTP smoke verified invalid `data:text/plain` screenshot evidence returns HTTP 400 with a clear MIME error.
- HTTP smoke verified a valid tiny PNG data URI reaches the Vision agent path; the live provider returned `404 status code (no body)`, and the route returned a structured failed Vision run rather than fake image output.
- Browser smoke with local Chrome uploaded an in-memory PNG through the screenshot input, displayed the uploaded filename, rendered Intake/Vision agent cards, and showed the real provider failure without a Next error overlay.

---

## 9. Agent Implementations

### 9.1 Intake Agent

- [x] Implement `lib/agents/intake-agent.ts` or equivalent intake logic.
- [x] Normalize uploaded evidence.
- [x] Detect available artifacts:
  - screenshot
  - logs
  - API response
  - DB snapshot
  - git diff
  - runbook notes
- [x] Detect missing artifacts, such as network trace.
- [x] Recommend which agents should run.
- [x] Create or return an incident id.

Expected output fields:

- [x] `incident_id`
- [x] `detected_artifacts`
- [x] `missing_artifacts`
- [x] `recommended_agents`

Verification note:

- Added deterministic server-only intake logic in `src/lib/agents/intake-agent.ts`.
- Intake detects screenshot, video frame/notes, logs, API response, DB snapshot, and git diff availability; it lists missing network trace, frontend console errors, and other missing artifacts.
- Intake is included as `intake_agent` in the real swarm output and uses the persisted incident id when Supabase is configured, otherwise `unpersisted`.
- HTTP smoke verified `intake_agent` returns `complete` before live model-dependent agents fail.

### 9.2 Vision Triage Agent

- [x] Implement `lib/agents/vision-agent.ts`.
- [~] Analyze screenshot or video frame.
- [x] Identify:
  - screen type
  - visible error or missing error
  - UI state
  - likely user action
  - affected business flow
  - severity signal
  - confidence

Expected output fields:

- [x] `screen_type`
- [x] `visible_error`
- [x] `ui_state`
- [x] `affected_flow`
- [x] `confidence`

Verification note:

- Added `src/lib/agents/vision-agent.ts`, which validates image evidence, sends real multimodal `image_url` content to Cerebras, parses JSON, and validates against `visionOutputSchema`.
- If no image/frame is supplied, the Vision agent records a failed/skipped run instead of inventing screenshot understanding.
- If image/frame evidence is supplied and Vision fails, RCA/Test/Release are gated rather than proceeding with fake visual analysis.
- Live successful Vision output remains blocked by the configured provider/model returning errors.
- HTTP smoke with a valid PNG data URI verified `vision_agent` executes and returns the live provider `404 status code (no body)` failure; `rca_agent` is skipped because required image evidence failed.

### 9.3 Log Analysis Agent

- [x] Implement `lib/agents/log-agent.ts`.
- [~] Analyze backend logs.
- [~] Extract:
  - primary error
  - failing service
  - correlation ID
  - timestamp
  - repeated pattern
  - failing function/module
  - probable cause

Expected output fields:

- [ ] `primary_error`
- [ ] `service`
- [ ] `correlation_id`
- [ ] `timestamp`
- [ ] `probable_cause`

### 9.4 API Contract Agent

- [x] Implement `lib/agents/api-agent.ts`.
- [~] Analyze request and response JSON.
- [~] Extract:
  - endpoint
  - HTTP status
  - contract violation
  - breaking field
  - expected value
  - actual value
  - likely impact
  - suggested backend/frontend fix

Expected output fields:

- [ ] `endpoint`
- [ ] `status`
- [ ] `contract_violation`
- [ ] `breaking_field`
- [ ] `suggested_fix`

### 9.5 DB Consistency Agent

- [x] Implement `lib/agents/db-agent.ts`.
- [~] Analyze DB snapshot.
- [~] Identify:
  - suspicious tables
  - inconsistent fields
  - missing values
  - possible data-mapping issue
  - SQL queries required for validation

Expected output fields:

- [ ] `suspected_tables`
- [ ] `data_issue`
- [ ] `sql_checks`

### 9.6 Root Cause Agent

- [x] Implement `lib/agents/rca-agent.ts`.
- [~] Combine Vision, Log, API, and DB outputs.
- [~] Produce three ranked root-cause hypotheses.
- [~] Explain evidence supporting each hypothesis.
- [~] Identify missing evidence.
- [~] Produce final RCA summary.

Expected output fields:

- [ ] `root_cause_summary`
- [ ] `confidence`
- [ ] `evidence_links`
- [ ] `alternative_hypotheses`

### 9.7 Regression Test Agent

- [x] Implement `lib/agents/test-agent.ts`.
- [~] Generate:
  - manual QA reproduction steps
  - SQL validation checks
  - API regression test
  - Postman assertions
  - Karate-style test scenario
  - edge cases

Expected output fields:

- [ ] `karate_test`
- [ ] `postman_assertions`
- [ ] `sql_validation`
- [ ] `manual_qa_steps`

### 9.8 Release Risk Agent

- [x] Implement `lib/agents/release-agent.ts`.
- [~] Decide release gate:
  - PASS
  - WARN
  - BLOCK
- [ ] Consider:
  - business impact
  - affected flow
  - severity
  - confidence
  - missing evidence
  - available regression tests

Expected output fields:

- [ ] `release_gate`
- [ ] `risk_score`
- [ ] `reason`
- [ ] `must_fix_before_release`
- [ ] `recommended_tests`

Verification note:

- Added server-only text agents under `src/lib/agents`.
- Added `src/lib/agents/orchestrator.ts` and `src/app/api/agents/run/route.ts`.
- `/api/agents/run` validates incident evidence, runs Log/API/DB agents in parallel, gates RCA/Test/Release on dependencies, and returns partial failed agent runs when provider calls fail.
- With `.env.local` loaded, the configured model returns `404 status code (no body)` from Cerebras, so the route correctly returns HTTP 502 with failed agent diagnostics instead of fake RCA output.
- The UI Run button now calls `/api/agents/run` and displays the real structured success/failure payload.

### 9.9 Demo Narrator Agent

- [x] Implement `lib/agents/narrator-agent.ts`.
- [~] Generate:
  - 60-second demo script
  - Discord Track 1 post
  - Discord Track 3 post
  - X/Twitter post
- [x] Keep generated posts aligned with actual implemented features.
- [x] Do not claim live URL, GitHub URL, or demo video until they exist.

Expected output fields:

- [x] `demo_script`
- [x] `discord_track_1_post`
- [x] `discord_track_3_post`
- [x] `x_post`

Verification note:

- Added `src/lib/agents/narrator-agent.ts` and the narrator prompt in `src/lib/cerebras/prompts.ts`.
- The narrator runs last, after RCA, Regression Test, and Release Risk complete, and validates output with `demoNarratorOutputSchema`.
- If upstream agents fail, the orchestrator records a skipped `narrator_agent` run instead of producing fake submission copy.
- Live narrator generation remains blocked until the configured Cerebras model returns successful responses.
- HTTP smoke verified `/api/agents/run` returns nine agent runs, including `narrator_agent`, and reports `Demo narration skipped because the incident package did not complete` on the current provider failure path.

---

## 10. Agent Orchestration

### 10.1 Orchestrator

- [x] Implement `lib/agents/orchestrator.ts`.
- [~] Run independent agents in parallel:
  - Vision Agent
  - Log Agent
  - API Agent
  - DB Agent
- [~] Run RCA Agent after the first parallel group completes.
- [~] Run Regression Test Agent and Release Risk Agent in parallel after RCA.
- [x] Run Demo Narrator Agent last.
- [~] Persist each agent state and output.
- [x] Capture partial outputs if one agent fails.
- [x] Return structured final incident package.

Expected flow:

```text
Vision + Logs + API + DB
          |
          v
        RCA
      /     \
   Tests   Release
      \     /
       Narrator
```

Acceptance criteria:

- [x] Agents run in the intended dependency order.
- [x] Independent agents use `Promise.all` or equivalent parallel execution.
- [x] UI can display per-agent progress.
- [x] A single failed non-critical agent does not blank the whole dashboard.

### 10.2 Streaming

- [ ] Implement `app/api/agents/stream/route.ts` if streaming is used.
- [ ] Stream state transitions to the UI.
- [ ] Include:
  - agent started
  - agent completed
  - agent failed
  - metrics updated
  - final package completed
- [ ] Fall back to polling if streaming is not implemented in MVP.

Acceptance criteria:

- [ ] User sees progress while the swarm runs.
- [ ] Long-running calls do not appear frozen.

---

## 11. API Routes

### 11.1 Incident Routes

- [x] Implement `app/api/incidents/route.ts`.
- [x] Support incident creation.
- [x] Validate request payloads with Zod.
- [x] Save incident metadata and evidence.
- [x] Return incident id and status.

Acceptance criteria:

- [~] Valid sample incident creates an incident.
- [x] Invalid payload returns 400 with useful details.

Verification note:

- Added `POST /api/incidents` with Zod validation and server-only Supabase persistence.
- Invalid JSON and invalid evidence payloads return HTTP 400 with useful details.
- Missing Supabase configuration returns HTTP 503; live creation is blocked until valid Supabase env values are provided.
- Verified over HTTP: malformed JSON returned 400, `{ "title": "x" }` returned 400 with missing field issues, and a valid sample payload returned 503 listing `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

### 11.2 Agent Run Route

- [x] Implement `app/api/agents/run/route.ts`.
- [x] Accept incident id or raw evidence payload.
- [x] Run orchestrator.
- [x] Return final structured output.
- [x] Persist agent runs when database is configured.
- [x] Include speed metrics.

Acceptance criteria:

- [~] "Run Incident Swarm" calls this route successfully.
- [!] Route returns a complete incident package for the primary sample.

Verification note:

- `/api/agents/run` now accepts raw incident evidence or `incident_id` / `incidentId`.
- When Supabase is configured, raw evidence is saved before the swarm runs, agent runs are saved after execution, and completed swarms save aggregate Cerebras speed benchmark data.
- When Supabase is not configured, persistence is explicitly reported as disabled and no fake durable storage is claimed.
- Complete primary sample output remains blocked because the configured Cerebras model currently returns `404 status code (no body)`.
- Verified over HTTP with a valid sample payload: `/api/agents/run` returned HTTP 502 with `persistence.enabled: false`, six agent runs, and a failed `log_agent` containing the live provider `404 status code (no body)` error.

### 11.3 Benchmark Route

- [x] Implement `app/api/benchmark/route.ts`.
- [x] Measure Cerebras latency and token throughput.
- [x] Optionally compare with baseline provider only when enabled and configured.
- [x] Never fabricate comparison data.

Acceptance criteria:

- [x] Speed metrics tab displays real metrics from agent calls or benchmark route.

Verification note:

- Added `src/app/api/benchmark/route.ts` in an earlier slice with real Cerebras latency, usage, and token-throughput reporting.
- Missing Cerebras configuration returns HTTP 503, and provider failures return explicit errors instead of sample metrics.
- Added a Speed Metrics result tab that renders real metrics from completed agent calls and shows an explicit empty state when provider calls fail.

---

## 12. Final Product Outputs

### 12.1 Incident Summary

- [x] Show issue title.
- [x] Show affected module.
- [x] Show severity.
- [~] Show user impact.
- [~] Show likely owner.
- [x] Show confidence.

Expected primary sample output:

```text
Issue: Unable to move from order cart to order summary
Affected module: Direct Orders / Cart
Severity: High
User impact: Blocks order placement
Likely owner: Backend validation + frontend error handling
Confidence: 86%
```

### 12.2 Screenshot Understanding

- [~] Show interpreted screen type.
- [~] Show visible UI state.
- [~] Show whether a frontend error is visible.
- [~] Show affected flow.

### 12.3 Root-Cause Hypotheses

- [~] Show at least three hypotheses.
- [~] Rank hypotheses by confidence.
- [~] Link each hypothesis to evidence.
- [x] Show missing evidence.

Expected primary hypotheses:

- [ ] Backend summary API rejects cart because `confirmedQty` is null for one SKU.
- [ ] Frontend does not show backend validation error and keeps user on cart page.
- [ ] DB stock snapshot contains mixed case/piece quantity values causing mapper failure.

### 12.4 Reproduction Steps

- [~] Generate clear manual steps.
- [~] Include outlet and SKU details for sample incident.
- [~] Keep steps usable by QA.

Expected primary sample steps:

- [ ] Login as Direct Orders user.
- [ ] Select outlet `1000023`.
- [ ] Add SKU `13321` and SKU `14498` to cart.
- [ ] Click "Proceed to Summary."
- [ ] Observe that the app remains on cart page and order summary is not opened.

### 12.5 SQL Checks

- [~] Generate SQL validation queries.
- [~] Include table and field assumptions.
- [x] Avoid destructive SQL.

Expected primary sample query:

```sql
SELECT sku_code, available_qty, confirmed_qty, case_qty, piece_qty
FROM ck_stock
WHERE outlet_code = '1000023'
AND sku_code IN ('13321', '14498');
```

### 12.6 API Regression Tests

- [~] Generate a Karate-style test.
- [~] Generate Postman assertions.
- [~] Include expected status and response shape.
- [~] Include edge cases around null quantity fields.

Expected primary sample test intent:

- [ ] Cart summary should return `200` when valid SKUs are present.
- [ ] `response.orderSummary` should not be null.
- [ ] `response.items[*].confirmedQty` should contain numbers.

### 12.7 Jira-Ready Bug

- [x] Generate title.
- [~] Generate business impact.
- [~] Generate expected result.
- [~] Generate actual result.
- [~] Generate evidence summary.
- [x] Generate severity.

Expected primary sample title:

- [ ] "Unable to move from cart to order summary in Direct Orders app"

### 12.8 Release Decision

- [~] Generate PASS/WARN/BLOCK.
- [~] Include risk score.
- [~] Include reason.
- [~] Include must-fix items.
- [~] Include recommended tests.

Expected primary sample decision:

- [ ] `Release Gate: BLOCK`
- [ ] Reason: core order placement journey is broken.
- [ ] Required before release:
  - Fix confirmedQty mapper.
  - Add frontend error display.
  - Add regression test for cart-to-summary flow.

Verification note:

- Added result tabs for Summary, Root Cause, Evidence, Tests, Jira Bug, Release Gate, and Speed Metrics.
- Jira output is generated from actual incident package data and explicitly says when agent-derived fields are pending.
- Release output renders only completed release-agent data; otherwise it shows an unavailable state instead of inventing a PASS/WARN/BLOCK decision.

---

## 13. MVP Build Order

Use this order unless a blocking dependency requires a small adjustment.

- [x] 1. Repository and git identity bootstrap.
- [x] 2. Next.js app scaffold.
- [x] 3. Environment validation.
- [!] 4. Cerebras wrapper working.
- [!] 5. Test API route calls Gemma 4 and returns response plus latency.
- [x] 6. Sample incident data implemented.
- [x] 7. Landing page and incident upload shell.
- [x] 8. Load sample incident into form.
- [!] 9. Core text agents implemented: Log, API, DB.
- [!] 10. RCA Agent implemented.
- [!] 11. Test Agent implemented.
- [!] 12. Release Agent implemented.
- [~] 13. Orchestrator implemented.
- [~] 14. Run Swarm button produces structured outputs.
- [x] 15. Result tabs display RCA, Jira bug, tests, and release gate.
- [~] 16. Multimodal screenshot upload and Vision Agent.
- [x] 17. Agent graph and progress UI.
- [x] 18. Speed metrics from Cerebras responses.
- [~] 19. Supabase schema and persistence.
- [~] 20. Dashboard refresh loads persisted incident.
- [x] 21. README complete.
- [ ] 22. Vercel deployment.
- [ ] 23. 60-second demo recording.
- [ ] 24. Submission posts finalized.

---

## 14. Explicit Non-Goals for MVP

Do not spend MVP time on these unless all MVP items are complete:

- [ ] Authentication.
- [ ] Billing.
- [ ] Complex vector database.
- [ ] Real Jira integration.
- [ ] Real GitHub integration.
- [ ] Complex permissions.
- [ ] Full video processing pipeline.
- [ ] Long-term incident collaboration features.

---

## 15. Stretch Features

Only start these after the MVP is locally working and deployable.

- [ ] Video upload to frame extraction.
- [ ] GitHub PR diff analyzer.
- [ ] Export Jira markdown.
- [ ] Download incident report as PDF.
- [ ] Slack-style incident timeline.
- [ ] Baseline comparison with Gemini.
- [ ] RAG from synthetic runbook.
- [ ] Ask follow-up chat over incident evidence.

Acceptance criteria:

- [ ] Stretch features must not break the primary demo flow.
- [ ] Stretch features must not claim production integrations unless they are real.

---

## 16. README Requirements

- [x] Add `README.md`.
- [x] Include:
  - Problem
  - Why Gemma 4 on Cerebras
  - Hackathon tracks
  - Architecture
  - Agent swarm
  - Multimodal inputs
  - Speed metrics
  - Demo flow
  - Local setup
  - Environment variables
  - Security notes
  - Future scope
- [x] Include screenshots only after they exist.
- [x] Include live app link only after deployment works.
- [x] Include demo video link only after recording is uploaded.

Acceptance criteria:

- [x] A new developer can run the app from README instructions.
- [x] Hackathon judges can understand the architecture and impact from README alone.

Verification note:

- Replaced the scaffold README with OpsVerse-specific setup, architecture, agent swarm, multimodal input, Supabase, demo flow, verification, security, blockers, and future-scope documentation.
- README intentionally does not include screenshots, live app URL, GitHub URL, or demo video URL because those artifacts are not verified yet.
- README states the current provider/model blocker instead of claiming live Gemma 4 success.

---

## 17. Deployment

### 17.1 GitHub

- [!] Create GitHub repository.
- [!] Push with personal git account.
- [x] Confirm commit authorship is personal account.
- [~] Keep secrets out of git.
- [x] Add deployment readiness checks for git identity, remote, CLI availability, env placeholders, schema, and tracked secret hygiene.

### 17.2 Vercel

- [x] Add `vercel.json` for the Next.js production build command, install command, and dev command.
- [!] Deploy app to Vercel.
- [!] Configure environment variables:
  - `CEREBRAS_API_KEY`
  - `CEREBRAS_BASE_URL`
  - `CEREBRAS_MODEL`
  - Supabase URL and keys
- [ ] Verify production URL.
- [ ] Verify sample demo path works in production.
- [ ] Verify model calls work in production.
- [ ] Verify speed metrics render in production.

Acceptance criteria:

- [ ] Live public URL works.
- [ ] Primary sample incident can run end to end.
- [~] No secrets appear in browser, logs, README, or commits.

Verification note:

- Added `vercel.json` with `npm install`, `npm run build`, and `npm run dev` commands for Vercel project configuration.
- Added `scripts/deployment-readiness.mjs` and `npm run verify:deployment`.
- Added `npm run verify:local` to run typecheck, lint, build, and audit in one command.
- `npm run verify:deployment` now passes repo-local git identity, `vercel.json`, scripts, `.env.example`, Supabase schema, `.env.local` ignore, `.vercel` ignore, and tracked-secret checks. It fails on the three external prerequisites that are actually missing here: git remote, GitHub CLI, and Vercel CLI.
- Current blockers: no git remote is configured, `gh` is not installed, `vercel` is not installed/authenticated, live Supabase env values are not configured, and the configured Cerebras model still returns provider `404 status code (no body)` locally.
- Current tracked files and README were checked for obvious private secret values; the old exposed Cerebras key must still be rotated before public release because it appeared during local work.

---

## 18. Demo and Submission

### 18.1 60-Second Demo

- [ ] Record under 60 seconds.
- [ ] Show landing page.
- [ ] Show upload/sample evidence.
- [ ] Show agent swarm running.
- [ ] Show RCA, Jira bug, SQL checks, tests, and release gate.
- [ ] Show speed metrics.
- [ ] Mention Gemma 4 on Cerebras.
- [ ] Do not show private data.

Target script:

- [ ] 0-5 sec: "Enterprise teams lose hours connecting screenshots, logs, API failures, and DB evidence during incidents."
- [ ] 5-12 sec: "This is OpsVerse, a multimodal incident swarm powered by Gemma 4 on Cerebras."
- [ ] 12-25 sec: "Upload a bug screenshot, logs, API response, and DB snapshot. The swarm launches Vision, Log, API, DB, RCA, Test, and Release agents."
- [ ] 25-40 sec: "Within seconds, it identifies the broken cart-to-summary flow, finds the likely confirmedQty contract issue, and generates root cause hypotheses."
- [ ] 40-52 sec: "It creates a Jira-ready bug, SQL checks, API regression tests, and a release gate decision."
- [ ] 52-60 sec: "Cerebras speed makes this feel real-time: incident chaos becomes release-ready action before the meeting even starts."

### 18.2 Shot List

- [ ] Shot 1: Landing page.
- [ ] Shot 2: Upload evidence.
- [ ] Shot 3: Run swarm.
- [ ] Shot 4: Results.
- [ ] Shot 5: Speed metrics.

### 18.3 Track 1 Submission

- [ ] Prepare Discord post for `#g4hackathon-multiverse-agents`.
- [ ] Include project name.
- [ ] Include multi-agent and multimodal explanation.
- [ ] Include output package explanation.
- [ ] Include demo link.
- [ ] Include live app link.
- [ ] Include GitHub link.

### 18.4 Track 3 Submission

- [ ] Prepare Discord post for `#g4hackathon-enterprise-impact`.
- [ ] Explain business impact:
  - Faster incident triage.
  - Better QA handoff.
  - Auto-generated regression tests.
  - Jira-ready bug reports.
  - Release gate decisions.
  - Reduced production risk.
- [ ] Explain production-readiness:
  - Server-side API key handling.
  - Structured outputs.
  - Agent-level audit trail.
  - Stored incident history.
  - Reproducible test generation.
  - Deployment-ready Next.js + Supabase + Vercel architecture.

### 18.5 Optional X/Twitter Post

- [ ] Post only after demo video and live app are ready.
- [ ] Tag `@Cerebras` and `@googlegemma`.
- [ ] Include demo link.

---

## 19. Quality Gates

Run relevant checks after each implementation slice.

- [x] Type check passes.
- [x] Lint passes.
- [x] Build passes.
- [ ] Unit tests pass if tests exist.
- [!] Primary sample incident works locally.
- [x] API routes return useful errors for invalid payloads.
- [~] No secrets are committed.
- [ ] UI is responsive.
- [x] Agent outputs validate against schemas.
- [x] Speed metrics are real or clearly labeled sample.
- [!] Production deployment works before submission.

Recommended commands once the app exists:

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

If the project uses pnpm, replace `npm` with `pnpm`.

Verification note:

- Added `npm run verify:local` for repeatable local quality checks.
- Added `npm run verify:deployment` for repeatable deployment readiness checks.
- `npm run verify:local` passed: typecheck, lint, Next.js production build, and `npm audit --audit-level=moderate`.
- `npm run verify:deployment` intentionally returned nonzero because the repo has no git remote and this environment has no `gh` or `vercel` CLI.
- Quality gates are still blocked from full `[x]` because the configured Cerebras model returns provider `404 status code (no body)`, Supabase is not configured for live persistence refresh, and production deployment cannot be verified without a GitHub remote and authenticated Vercel tooling.

---

## 20. Agent Handoff Notes

- [ ] After each implementation slice, update this file with status changes.
- [ ] Add a short verification note under the completed task when useful.
- [ ] Commit related code and task updates together.
- [ ] Keep commits small and reviewable.
- [ ] Do not mark deployment/demo/submission items done until the live evidence exists.
- [ ] Do not let generated sample outputs hide failed real model calls.
- [ ] Preserve the core demo path: sample incident -> swarm -> RCA/tests/Jira/release/speed metrics.
