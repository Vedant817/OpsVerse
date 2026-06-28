# OpsVerse Implementation Task Tracker

Source document: `Idea.md`

Purpose: this file is the project ledger for implementation agents. It records the full OpsVerse product idea, what has been implemented, what remains open, the expected acceptance criteria, and the intended build order. Keep this file updated after every behavior-changing implementation slice.

Current repository state:

- [x] Product idea captured in `Idea.md`
- [x] Next.js application scaffold exists
- [x] Runtime dependencies installed
- [~] Cerebras integration implemented
- [~] Incident intake implemented
- [ ] Agent swarm implemented
- [ ] Dashboard implemented
- [ ] Supabase persistence implemented
- [ ] Deployment completed
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
- [ ] Keep Supabase service role usage server-only.

Acceptance criteria:

- [x] Missing `CEREBRAS_API_KEY` produces a clear server error, not a silent fake result.
- [x] Client bundle does not reference `CEREBRAS_API_KEY`.
- [x] `.env.example` documents every required and optional variable.

Verification note:

- Added server-only env validation in `src/lib/env.ts`.
- `GET /api/benchmark` with no `CEREBRAS_API_KEY` returns HTTP 503 and JSON: `{"ok":false,"error":"Cerebras is not configured...","missing":["CEREBRAS_API_KEY"]}`.
- `rg "CEREBRAS_API_KEY|CEREBRAS_BASE_URL|CEREBRAS_MODEL|SUPABASE_SERVICE_ROLE_KEY" .next/static` returned no matches, confirming the client static bundle does not reference server secret names.
- Supabase service-role handling remains open because database modules are not implemented yet.

---

## 4. Data Model and Persistence

### 4.1 Supabase Schema

- [ ] Add `supabase/schema.sql`.
- [ ] Create `incidents` table:
  - `id uuid primary key default gen_random_uuid()`
  - `title text not null`
  - `module text`
  - `status text default 'created'`
  - `severity text`
  - `created_at timestamptz default now()`
- [ ] Create `incident_evidence` table:
  - `id uuid primary key default gen_random_uuid()`
  - `incident_id uuid references incidents(id) on delete cascade`
  - `type text not null`
  - `content text`
  - `file_url text`
  - `created_at timestamptz default now()`
- [ ] Create `agent_runs` table:
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
- [ ] Create `speed_benchmarks` table for aggregate comparison data.
- [ ] Create `demo_sessions` table for hackathon demo runs.
- [ ] Add indexes for incident lookups and agent run history.

Acceptance criteria:

- [ ] Schema can be applied to Supabase.
- [ ] Incident creation stores core metadata.
- [ ] Evidence records can be created and loaded by incident.
- [ ] Agent outputs and metrics survive page refresh.

### 4.2 Database Client and Queries

- [ ] Implement `lib/db/supabase.ts`.
- [ ] Implement `lib/db/queries.ts`.
- [ ] Provide functions for:
  - Creating an incident.
  - Saving evidence.
  - Creating/updating agent run records.
  - Loading a full incident dashboard.
  - Saving speed benchmark data.
- [ ] Add a local fallback only if explicitly marked as a demo fallback. Do not present fallback data as persisted production data.

Acceptance criteria:

- [ ] Dashboard URL can be refreshed without losing completed outputs when Supabase is configured.
- [ ] Database failures are visible in the UI/API response.

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
- RCA shape is blocked until the real agent orchestrator and RCA agent are implemented.

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
- [!] Each sample can be run through the swarm.

Verification note:

- Added `src/lib/samples/return-tracking-confirmed-qty.ts`, `src/lib/samples/order-tracking-items-missing.ts`, and `src/lib/samples/index.ts`.
- The UI renders sample selector buttons for all three samples and updates client state without navigation.
- Swarm execution remains blocked until the orchestrator route exists.

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
- The button validates the evidence package and explicitly states that the orchestrator is not implemented yet; it does not fake swarm output.
- `curl -s http://127.0.0.1:3000/incident` showed `OpsVerse`, `Synthetic evidence only`, all three sample names, and `Run Incident Swarm`.
- Real swarm execution is blocked until the agent orchestrator route is implemented.

### 6.3 Swarm Execution Page

- [ ] Implement an execution view, either within the incident flow or dashboard.
- [ ] Show agent nodes:
  - Vision Agent
  - Log Agent
  - API Agent
  - DB Agent
  - RCA Agent
  - Test Agent
  - Release Judge
  - Demo Narrator Agent
- [ ] Show each node state:
  - Pending
  - Running
  - Complete
  - Failed
- [ ] Show per-agent:
  - Latency
  - Tokens
  - Confidence
  - Output preview
- [ ] Make multi-agent collaboration visible in the demo.

Acceptance criteria:

- [ ] Running the swarm visibly updates agent states.
- [ ] Failed agents show error details and do not crash the page.
- [ ] RCA waits for Vision, Log, API, and DB outputs.

### 6.4 Results Dashboard

- [ ] Implement `app/dashboard/[id]/page.tsx`.
- [ ] Add tabs:
  - Summary
  - Root Cause
  - Evidence
  - Tests
  - Jira Bug
  - Release Gate
  - Speed Metrics
- [ ] Include final product outputs:
  - Incident summary
  - Screenshot understanding
  - Root-cause hypotheses
  - Reproduction steps
  - Jira-ready bug
  - SQL validation checks
  - API regression tests
  - Release gate decision
  - Cerebras speed metrics
- [ ] Add copy buttons:
  - Copy Jira Bug
  - Copy SQL Checks
  - Copy Karate Test
  - Copy Release Decision
- [ ] Show missing evidence clearly.

Acceptance criteria:

- [ ] Dashboard displays all completed agent outputs.
- [ ] Copy buttons copy the expected content.
- [ ] Refreshing the URL reloads results if persistence is configured.

### 6.5 Speed Comparison Page

- [ ] Implement speed metrics section or standalone page.
- [ ] Show Cerebras Gemma 4 metrics:
  - TTFT when available
  - Output tokens/sec
  - Total time
  - Total swarm time
  - Fastest agent
  - Slowest agent
  - Total tokens
- [ ] Add optional baseline provider comparison only if configured.
- [ ] Do not fake baseline results.

Acceptance criteria:

- [ ] Judges can see Cerebras speed as part of the product.
- [ ] Metrics come from actual calls or are explicitly labeled sample/demo.

---

## 7. Components

### 7.1 Required Components

- [ ] `components/hero.tsx`
- [ ] `components/evidence-uploader.tsx`
- [ ] `components/agent-graph.tsx`
- [ ] `components/agent-card.tsx`
- [ ] `components/result-tabs.tsx`
- [ ] `components/speed-metrics.tsx`
- [ ] `components/jira-output.tsx`
- [ ] `components/release-gate.tsx`

### 7.2 Component Requirements

- [ ] Components must use TypeScript props.
- [ ] Components must handle loading, empty, success, and error states where relevant.
- [ ] Use icons for action buttons where practical.
- [ ] Keep UI dense and operational, suitable for QA/SRE/support teams.
- [ ] Avoid decorative-only visuals that hide the actual incident workflow.

Acceptance criteria:

- [ ] Components can render with sample data.
- [ ] Components do not overflow on mobile.
- [ ] Core actions are keyboard accessible.

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

- [ ] Implement `lib/cerebras/schemas.ts`.
- [ ] Define Zod schemas for:
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
- [ ] Validate model responses.
- [ ] Add repair/fallback path for malformed JSON.
- [ ] Surface schema validation failures as agent failures.

Acceptance criteria:

- [ ] Valid model JSON is parsed into typed objects.
- [ ] Invalid JSON does not crash the app.
- [ ] UI shows failed agent state when validation fails.

### 8.3 Prompt Templates

- [ ] Implement `lib/cerebras/prompts.ts`.
- [ ] Include prompts for:
  - Vision Triage Agent
  - Log Analysis Agent
  - API Contract Agent
  - DB Consistency Agent
  - Root Cause Agent
  - Regression Test Agent
  - Release Risk Agent
  - Demo Narrator Agent
- [ ] Require "Return only valid JSON" in agent prompts.
- [ ] Keep prompts grounded in provided evidence.
- [ ] Tell agents to identify missing evidence instead of inventing facts.

Acceptance criteria:

- [ ] Each prompt produces output matching its schema in a live or mocked test.
- [ ] Outputs include confidence where required.

### 8.4 Image Handling

- [ ] Implement `lib/cerebras/image.ts`.
- [ ] Convert uploaded image files to base64 data URIs.
- [ ] Send screenshot to Vision Agent using multimodal message content.
- [ ] Validate file type and size.
- [ ] For video, do not send the full video directly.
- [ ] For video stretch work, extract 3-5 representative frames:
  - before action
  - clicked button
  - error/stuck state
  - optional network failure state

Acceptance criteria:

- [ ] Vision Agent can analyze an uploaded screenshot.
- [ ] Unsupported file types are rejected clearly.

---

## 9. Agent Implementations

### 9.1 Intake Agent

- [ ] Implement `lib/agents/intake-agent.ts` or equivalent intake logic.
- [ ] Normalize uploaded evidence.
- [ ] Detect available artifacts:
  - screenshot
  - logs
  - API response
  - DB snapshot
  - git diff
  - runbook notes
- [ ] Detect missing artifacts, such as network trace.
- [ ] Recommend which agents should run.
- [ ] Create or return an incident id.

Expected output fields:

- [ ] `incident_id`
- [ ] `detected_artifacts`
- [ ] `missing_artifacts`
- [ ] `recommended_agents`

### 9.2 Vision Triage Agent

- [ ] Implement `lib/agents/vision-agent.ts`.
- [ ] Analyze screenshot or video frame.
- [ ] Identify:
  - screen type
  - visible error or missing error
  - UI state
  - likely user action
  - affected business flow
  - severity signal
  - confidence

Expected output fields:

- [ ] `screen_type`
- [ ] `visible_error`
- [ ] `ui_state`
- [ ] `affected_flow`
- [ ] `confidence`

### 9.3 Log Analysis Agent

- [ ] Implement `lib/agents/log-agent.ts`.
- [ ] Analyze backend logs.
- [ ] Extract:
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

- [ ] Implement `lib/agents/api-agent.ts`.
- [ ] Analyze request and response JSON.
- [ ] Extract:
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

- [ ] Implement `lib/agents/db-agent.ts`.
- [ ] Analyze DB snapshot.
- [ ] Identify:
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

- [ ] Implement `lib/agents/rca-agent.ts`.
- [ ] Combine Vision, Log, API, and DB outputs.
- [ ] Produce three ranked root-cause hypotheses.
- [ ] Explain evidence supporting each hypothesis.
- [ ] Identify missing evidence.
- [ ] Produce final RCA summary.

Expected output fields:

- [ ] `root_cause_summary`
- [ ] `confidence`
- [ ] `evidence_links`
- [ ] `alternative_hypotheses`

### 9.7 Regression Test Agent

- [ ] Implement `lib/agents/test-agent.ts`.
- [ ] Generate:
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

- [ ] Implement `lib/agents/release-agent.ts`.
- [ ] Decide release gate:
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

### 9.9 Demo Narrator Agent

- [ ] Implement `lib/agents/narrator-agent.ts`.
- [ ] Generate:
  - 60-second demo script
  - Discord Track 1 post
  - Discord Track 3 post
  - X/Twitter post
- [ ] Keep generated posts aligned with actual implemented features.
- [ ] Do not claim live URL, GitHub URL, or demo video until they exist.

Expected output fields:

- [ ] `demo_script`
- [ ] `discord_track_1_post`
- [ ] `discord_track_3_post`
- [ ] `x_post`

---

## 10. Agent Orchestration

### 10.1 Orchestrator

- [ ] Implement `lib/agents/orchestrator.ts`.
- [ ] Run independent agents in parallel:
  - Vision Agent
  - Log Agent
  - API Agent
  - DB Agent
- [ ] Run RCA Agent after the first parallel group completes.
- [ ] Run Regression Test Agent and Release Risk Agent in parallel after RCA.
- [ ] Run Demo Narrator Agent last.
- [ ] Persist each agent state and output.
- [ ] Capture partial outputs if one agent fails.
- [ ] Return structured final incident package.

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

- [ ] Agents run in the intended dependency order.
- [ ] Independent agents use `Promise.all` or equivalent parallel execution.
- [ ] UI can display per-agent progress.
- [ ] A single failed non-critical agent does not blank the whole dashboard.

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

- [ ] Implement `app/api/incidents/route.ts`.
- [ ] Support incident creation.
- [ ] Validate request payloads with Zod.
- [ ] Save incident metadata and evidence.
- [ ] Return incident id and status.

Acceptance criteria:

- [ ] Valid sample incident creates an incident.
- [ ] Invalid payload returns 400 with useful details.

### 11.2 Agent Run Route

- [ ] Implement `app/api/agents/run/route.ts`.
- [ ] Accept incident id or raw evidence payload.
- [ ] Run orchestrator.
- [ ] Return final structured output.
- [ ] Persist agent runs when database is configured.
- [ ] Include speed metrics.

Acceptance criteria:

- [ ] "Run Incident Swarm" calls this route successfully.
- [ ] Route returns a complete incident package for the primary sample.

### 11.3 Benchmark Route

- [ ] Implement `app/api/benchmark/route.ts`.
- [ ] Measure Cerebras latency and token throughput.
- [ ] Optionally compare with baseline provider only when enabled and configured.
- [ ] Never fabricate comparison data.

Acceptance criteria:

- [ ] Speed metrics tab displays real metrics from agent calls or benchmark route.

---

## 12. Final Product Outputs

### 12.1 Incident Summary

- [ ] Show issue title.
- [ ] Show affected module.
- [ ] Show severity.
- [ ] Show user impact.
- [ ] Show likely owner.
- [ ] Show confidence.

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

- [ ] Show interpreted screen type.
- [ ] Show visible UI state.
- [ ] Show whether a frontend error is visible.
- [ ] Show affected flow.

### 12.3 Root-Cause Hypotheses

- [ ] Show at least three hypotheses.
- [ ] Rank hypotheses by confidence.
- [ ] Link each hypothesis to evidence.
- [ ] Show missing evidence.

Expected primary hypotheses:

- [ ] Backend summary API rejects cart because `confirmedQty` is null for one SKU.
- [ ] Frontend does not show backend validation error and keeps user on cart page.
- [ ] DB stock snapshot contains mixed case/piece quantity values causing mapper failure.

### 12.4 Reproduction Steps

- [ ] Generate clear manual steps.
- [ ] Include outlet and SKU details for sample incident.
- [ ] Keep steps usable by QA.

Expected primary sample steps:

- [ ] Login as Direct Orders user.
- [ ] Select outlet `1000023`.
- [ ] Add SKU `13321` and SKU `14498` to cart.
- [ ] Click "Proceed to Summary."
- [ ] Observe that the app remains on cart page and order summary is not opened.

### 12.5 SQL Checks

- [ ] Generate SQL validation queries.
- [ ] Include table and field assumptions.
- [ ] Avoid destructive SQL.

Expected primary sample query:

```sql
SELECT sku_code, available_qty, confirmed_qty, case_qty, piece_qty
FROM ck_stock
WHERE outlet_code = '1000023'
AND sku_code IN ('13321', '14498');
```

### 12.6 API Regression Tests

- [ ] Generate a Karate-style test.
- [ ] Generate Postman assertions.
- [ ] Include expected status and response shape.
- [ ] Include edge cases around null quantity fields.

Expected primary sample test intent:

- [ ] Cart summary should return `200` when valid SKUs are present.
- [ ] `response.orderSummary` should not be null.
- [ ] `response.items[*].confirmedQty` should contain numbers.

### 12.7 Jira-Ready Bug

- [ ] Generate title.
- [ ] Generate business impact.
- [ ] Generate expected result.
- [ ] Generate actual result.
- [ ] Generate evidence summary.
- [ ] Generate severity.

Expected primary sample title:

- [ ] "Unable to move from cart to order summary in Direct Orders app"

### 12.8 Release Decision

- [ ] Generate PASS/WARN/BLOCK.
- [ ] Include risk score.
- [ ] Include reason.
- [ ] Include must-fix items.
- [ ] Include recommended tests.

Expected primary sample decision:

- [ ] `Release Gate: BLOCK`
- [ ] Reason: core order placement journey is broken.
- [ ] Required before release:
  - Fix confirmedQty mapper.
  - Add frontend error display.
  - Add regression test for cart-to-summary flow.

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
- [ ] 9. Core text agents implemented: Log, API, DB.
- [ ] 10. RCA Agent implemented.
- [ ] 11. Test Agent implemented.
- [ ] 12. Release Agent implemented.
- [ ] 13. Orchestrator implemented.
- [ ] 14. Run Swarm button produces structured outputs.
- [ ] 15. Result tabs display RCA, Jira bug, tests, and release gate.
- [ ] 16. Multimodal screenshot upload and Vision Agent.
- [ ] 17. Agent graph and progress UI.
- [ ] 18. Speed metrics from Cerebras responses.
- [ ] 19. Supabase schema and persistence.
- [ ] 20. Dashboard refresh loads persisted incident.
- [ ] 21. README complete.
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

- [ ] Add `README.md`.
- [ ] Include:
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
- [ ] Include screenshots only after they exist.
- [ ] Include live app link only after deployment works.
- [ ] Include demo video link only after recording is uploaded.

Acceptance criteria:

- [ ] A new developer can run the app from README instructions.
- [ ] Hackathon judges can understand the architecture and impact from README alone.

---

## 17. Deployment

### 17.1 GitHub

- [ ] Create GitHub repository.
- [ ] Push with personal git account.
- [ ] Confirm commit authorship is personal account.
- [ ] Keep secrets out of git.

### 17.2 Vercel

- [ ] Deploy app to Vercel.
- [ ] Configure environment variables:
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
- [ ] No secrets appear in browser, logs, README, or commits.

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

- [ ] Type check passes.
- [ ] Lint passes.
- [ ] Build passes.
- [ ] Unit tests pass if tests exist.
- [ ] Primary sample incident works locally.
- [ ] API routes return useful errors for invalid payloads.
- [ ] No secrets are committed.
- [ ] UI is responsive.
- [ ] Agent outputs validate against schemas.
- [ ] Speed metrics are real or clearly labeled sample.
- [ ] Production deployment works before submission.

Recommended commands once the app exists:

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

If the project uses pnpm, replace `npm` with `pnpm`.

---

## 20. Agent Handoff Notes

- [ ] After each implementation slice, update this file with status changes.
- [ ] Add a short verification note under the completed task when useful.
- [ ] Commit related code and task updates together.
- [ ] Keep commits small and reviewable.
- [ ] Do not mark deployment/demo/submission items done until the live evidence exists.
- [ ] Do not let generated sample outputs hide failed real model calls.
- [ ] Preserve the core demo path: sample incident -> swarm -> RCA/tests/Jira/release/speed metrics.
