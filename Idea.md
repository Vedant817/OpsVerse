Paste this directly into GPT Canvas:

---

# OpsVerse — Multimodal Incident Swarm for Enterprise Apps

## Recommended Hackathon Track

Primary track: **Track 1 — Multiverse Agents: Best Multi-Agent + Multimodal Use Case**

Secondary track: **Track 3 — Enterprise Impact: Best Enterprise Use Case**

Optional bonus track: **Track 2 — People’s Choice**, only if the demo video is strong enough to post on X/Twitter.

The hackathon has three tracks: Multiverse Agents, People’s Choice, and Enterprise Impact. The demo must be under 60 seconds, should clearly show Cerebras speed, and can include a side-by-side comparison with another provider. The project should use **Gemma 4 31B on Cerebras** as the central model. 

---

# Project Name

## **OpsVerse**

### One-line pitch

**OpsVerse turns a bug screenshot, screen recording frames, logs, API responses, DB snapshots, and Git diffs into a complete incident report, root-cause hypothesis, reproduction steps, regression tests, and release-risk decision using a swarm of Gemma 4 agents running on Cerebras.**

---

# Why This Is the Best Idea

This project fits strongly because it matches real skills in:

* Backend and system engineering
* QA and test engineering
* API debugging
* Postman / JSON validation
* SQL checks
* Enterprise app workflows
* Bug reporting
* Incident analysis
* Agent orchestration
* Production-readiness thinking

Most hackathon teams may build generic chatbots, document Q&A tools, image captioners, or coding assistants. OpsVerse looks like a real enterprise-grade product.

The winning angle is:

> **Most AI incident tools summarize text. OpsVerse sees the broken UI, reads logs, checks API/DB evidence, coordinates specialist agents, and produces release-ready engineering action in seconds.**

---

# Core Product Idea

OpsVerse is a **multimodal incident-response control room**.

A user uploads:

1. App screenshot or video frames
2. Backend logs
3. API request/response JSON
4. DB snapshot
5. Optional Git diff
6. Optional runbook notes

Then OpsVerse launches multiple agents:

1. Vision Triage Agent
2. Log Analysis Agent
3. API Contract Agent
4. DB Consistency Agent
5. Root Cause Agent
6. Regression Test Agent
7. Release Risk Agent
8. Demo Narrator Agent

Final output:

* Incident summary
* Screenshot understanding
* Root-cause hypotheses
* Reproduction steps
* Jira-ready bug
* SQL validation checks
* API regression tests
* Release gate decision
* Speed metrics from Cerebras

---

# Best Demo Scenario

Use a synthetic enterprise app issue:

> “A Direct Orders field-sales app fails when the user moves from cart to order summary. The user uploads a screenshot, API response JSON, backend logs, and DB stock snapshot. OpsVerse analyzes everything and produces a Jira-ready bug, likely root cause, reproduction steps, SQL checks, API regression test, and release-risk decision.”

Important: Use only synthetic/sample data. Do not use real company data.

---

# Sample Demo Evidence

## Screenshot / Video Frame

A cart page showing:

* Products added to cart
* “Proceed to Summary” clicked
* App stuck on cart page
* No visible frontend error

## API Response

Example:

```json
{
  "endpoint": "/api/cart/summary",
  "status": 422,
  "error": "Validation failed",
  "details": [
    {
      "field": "items[0].confirmedQty",
      "message": "Expected number, received null"
    }
  ]
}
```

## Backend Logs

```text
2026-06-28T18:45:21Z ERROR order-service
CorrelationId=req-8f32
CartSummaryValidationException: confirmedQty cannot be null for SKU 13321
at CartSummaryValidator.validate(CartSummaryValidator.java:87)
at CartSummaryService.buildSummary(CartSummaryService.java:142)
```

## DB Snapshot

```csv
outlet_code,sku_code,available_qty,confirmed_qty,case_qty,piece_qty
1000023,13321,50,,1,12
1000023,14498,30,0,0,6
```

## Optional Git Diff

```diff
- confirmedQty: item.confirmedQty ?? 0
+ confirmedQty: item.confirmedQty
```

---

# Main User Flow

1. User opens OpsVerse.
2. User clicks **Load Demo Incident** or uploads real evidence.
3. App shows evidence sections:

   * Screenshot
   * Logs
   * API JSON
   * DB snapshot
   * Optional Git diff
4. User clicks **Run Incident Swarm**.
5. Agents run in parallel:

   * Vision Agent analyzes screenshot.
   * Log Agent analyzes logs.
   * API Agent checks contract failure.
   * DB Agent checks data consistency.
6. RCA Agent combines all findings.
7. Test Agent creates regression tests.
8. Release Agent gives release decision.
9. Dashboard displays complete incident package.
10. Speed Metrics tab shows Cerebras latency and token usage.

---

# Final Product Output

## 1. Incident Summary

```text
Issue: Unable to move from order cart to order summary
Affected module: Direct Orders / Cart
Severity: High
User impact: Blocks order placement
Likely owner: Backend validation + frontend error handling
Confidence: 86%
```

## 2. Screenshot Understanding

```text
The screenshot shows the cart page with products added, but the transition to the summary screen fails. The visible state suggests the cart has valid SKUs, but the summary action is blocked after backend validation.
```

## 3. Root-Cause Hypotheses

```text
1. Backend summary API rejects cart because confirmedQty is null for one SKU.
2. Frontend does not show backend validation error and keeps user on cart page.
3. DB stock snapshot contains mixed case/piece quantity values causing mapper failure.
```

## 4. Reproduction Steps

```text
1. Login as Direct Orders user.
2. Select outlet 1000023.
3. Add SKU 13321 and SKU 14498 to cart.
4. Click Proceed to Summary.
5. Observe that app remains on cart page and order summary is not opened.
```

## 5. SQL Checks

```sql
SELECT sku_code, available_qty, confirmed_qty, case_qty, piece_qty
FROM ck_stock
WHERE outlet_code = '1000023'
AND sku_code IN ('13321', '14498');
```

## 6. API Regression Test

```gherkin
Scenario: Cart should move to summary when valid SKUs are present
Given path '/cart/summary'
And request cartPayload
When method post
Then status 200
And match response.orderSummary != null
And match response.items[*].confirmedQty contains '#number'
```

## 7. Jira-Ready Bug

```text
Title:
Unable to move from cart to order summary in Direct Orders app

Business Impact:
Users cannot place orders even after adding valid SKUs to cart, blocking sales flow.

Expected:
User should move from cart page to order summary page.

Actual:
User remains on cart page after clicking proceed.

Evidence:
- Screenshot indicates cart has products.
- API logs show validation failure.
- DB snapshot suggests confirmedQty handling issue.

Severity:
High
```

## 8. Release Decision

```text
Release Gate: BLOCK

Reason:
Core order placement journey is broken.

Required before release:
- Fix confirmedQty mapper.
- Add frontend error display.
- Add regression test for cart-to-summary flow.
```

---

# Recommended Tech Stack

## Frontend

```text
Next.js 15
TypeScript
Tailwind CSS
shadcn/ui
React Flow
Framer Motion
Recharts
Lucide Icons
```

## Backend

```text
Next.js API Routes
Node.js runtime
Zod for schema validation
OpenAI-compatible Cerebras client
Supabase Postgres
Supabase Storage or Vercel Blob
```

## AI Layer

```text
Cerebras Inference API
Model: gemma-4-31b
Structured Outputs
Tool Calling
Image input via base64 data URI
Streaming responses
reasoning_effort: none / low / medium
```

## Database

```text
Supabase Postgres
```

Tables:

```text
incidents
incident_evidence
agent_runs
agent_outputs
speed_benchmarks
demo_sessions
```

## Deployment

```text
GitHub
Vercel
Supabase
Loom / Tella / OBS for demo recording
```

---

# Architecture

```text
User
  |
  | uploads screenshot / video frames / logs / API JSON / DB snapshot
  v
Next.js UI
  |
  v
Incident Intake API
  |
  +--> File normalizer
  +--> Image base64 encoder
  +--> Evidence parser
  |
  v
Agent Orchestrator
  |
  +--> Vision Triage Agent
  +--> Log Analysis Agent
  +--> API Contract Agent
  +--> DB Consistency Agent
  +--> Root Cause Agent
  +--> Regression Test Agent
  +--> Release Risk Agent
  +--> Demo Narrator Agent
  |
  v
Structured JSON outputs
  |
  v
Dashboard
  |
  +--> Incident summary
  +--> Agent graph
  +--> RCA timeline
  +--> Jira bug
  +--> SQL checks
  +--> API tests
  +--> Release decision
  +--> Cerebras speed metrics
```

---

# Agent Design

## 1. Intake Agent

Purpose:

Normalize uploaded evidence and decide which agents should run.

Input:

```json
{
  "title": "Unable to move from cart to order summary",
  "module": "Direct Orders",
  "screenshot": "base64 image",
  "logs": "...",
  "apiResponse": "...",
  "dbSnapshot": "...",
  "gitDiff": "optional"
}
```

Output:

```json
{
  "incident_id": "INC-001",
  "detected_artifacts": ["screenshot", "logs", "api_response", "db_snapshot"],
  "missing_artifacts": ["network_trace"],
  "recommended_agents": ["vision", "logs", "api", "db", "rca", "tests", "release"]
}
```

---

## 2. Vision Triage Agent

Purpose:

Read screenshot or video frames using Gemma 4 multimodal input.

Output:

```json
{
  "screen_type": "cart_page",
  "visible_error": "No explicit error shown",
  "ui_state": "Cart has products but user cannot proceed",
  "affected_flow": "cart_to_order_summary",
  "confidence": 0.82
}
```

---

## 3. Log Analysis Agent

Purpose:

Find backend errors, stack traces, failing services, and correlation IDs.

Output:

```json
{
  "primary_error": "CartSummaryValidationException",
  "service": "order-service",
  "correlation_id": "req-8f32",
  "timestamp": "2026-06-28T18:45:21Z",
  "probable_cause": "confirmedQty is null for SKU 13321"
}
```

---

## 4. API Contract Agent

Purpose:

Analyze API request/response JSON.

Output:

```json
{
  "endpoint": "/api/cart/summary",
  "status": 422,
  "contract_violation": "confirmedQty expected number but received null",
  "breaking_field": "items[0].confirmedQty",
  "suggested_fix": "Default confirmedQty to 0 or validate before summary generation"
}
```

---

## 5. DB Consistency Agent

Purpose:

Analyze DB snapshot and generate SQL checks.

Output:

```json
{
  "suspected_tables": ["ck_stock", "ck_cart_items", "ck_productdetails"],
  "data_issue": "confirmed_qty missing while available_qty exists",
  "sql_checks": [
    "SELECT sku_code, available_qty, confirmed_qty FROM ck_stock WHERE outlet_code='1000023';"
  ]
}
```

---

## 6. Root Cause Agent

Purpose:

Combine Vision, Log, API, and DB agent outputs.

Output:

```json
{
  "root_cause_summary": "The cart-to-summary flow fails because the backend summary API rejects a SKU where confirmedQty is null. The frontend does not surface the validation error, so the user remains stuck on the cart page.",
  "confidence": 0.86,
  "evidence_links": ["vision_agent", "log_agent", "api_agent", "db_agent"],
  "alternative_hypotheses": [
    "Frontend route transition bug",
    "Stock mapper issue",
    "Outlet-level configuration mismatch"
  ]
}
```

---

## 7. Regression Test Agent

Purpose:

Generate tests for QA and backend validation.

Output:

```json
{
  "karate_test": "...",
  "postman_assertions": "...",
  "sql_validation": "...",
  "manual_qa_steps": "..."
}
```

---

## 8. Release Risk Agent

Purpose:

Give release decision: PASS, WARN, or BLOCK.

Output:

```json
{
  "release_gate": "BLOCK",
  "risk_score": 91,
  "reason": "Core order placement journey is blocked",
  "must_fix_before_release": [
    "Handle null confirmedQty",
    "Show backend validation error in UI",
    "Add regression test for cart summary"
  ]
}
```

---

## 9. Demo Narrator Agent

Purpose:

Generate final 60-second demo script, Discord post, and X post.

Output:

```json
{
  "demo_script": "...",
  "discord_track_1_post": "...",
  "discord_track_3_post": "...",
  "x_post": "..."
}
```

---

# App Pages

## 1. Landing Page

Hero:

```text
OpsVerse
Multimodal Incident Swarm for Enterprise Apps

Upload a screenshot, logs, API response, and DB snapshot.
Gemma 4 agents on Cerebras turn chaos into RCA, tests, and release decisions in seconds.
```

Buttons:

```text
Run Demo Incident
Upload Evidence
View Architecture
```

Feature cards:

```text
Multimodal RCA
Agent Swarm
Release-Ready Output
```

---

## 2. Incident Upload Page

Fields:

```text
Incident title
Module / service
Screenshot upload
Video upload or frame upload
Logs textarea
API response textarea
DB snapshot textarea
Git diff textarea
```

Sample buttons:

```text
Load Sample: Cart Summary Failure
Load Sample: Return Tracking Qty Bug
Load Sample: Order Tracking Items Missing
```

---

## 3. Swarm Execution Page

Show agent nodes:

```text
Vision Agent
Log Agent
API Agent
DB Agent
RCA Agent
Test Agent
Release Judge
```

Each node should show:

```text
Pending → Running → Complete
Latency
Tokens
Confidence
```

---

## 4. Results Page

Tabs:

```text
Summary
Root Cause
Evidence
Tests
Jira Bug
Release Gate
Speed Metrics
```

---

## 5. Speed Comparison Page

Show:

```text
Cerebras Gemma 4
TTFT: xxx ms
Output tokens/sec: xxx
Total time: x.x sec
```

Optional comparison:

```text
Baseline Provider
TTFT: xxx ms
Output tokens/sec: xxx
Total time: x.x sec
```

---

# Repository Structure

```text
opsverse/
  app/
    page.tsx
    layout.tsx
    globals.css

    incident/
      page.tsx

    dashboard/
      [id]/
        page.tsx

    api/
      incidents/
        route.ts
      agents/
        run/
          route.ts
      agents/
        stream/
          route.ts
      benchmark/
        route.ts

  components/
    hero.tsx
    evidence-uploader.tsx
    agent-graph.tsx
    agent-card.tsx
    result-tabs.tsx
    speed-metrics.tsx
    jira-output.tsx
    release-gate.tsx

  lib/
    cerebras/
      client.ts
      prompts.ts
      schemas.ts
      image.ts
      benchmark.ts

    agents/
      orchestrator.ts
      vision-agent.ts
      log-agent.ts
      api-agent.ts
      db-agent.ts
      rca-agent.ts
      test-agent.ts
      release-agent.ts
      narrator-agent.ts

    db/
      supabase.ts
      queries.ts

    samples/
      cart-summary-failure.ts
      return-tracking-confirmed-qty.ts
      order-tracking-items-missing.ts

  supabase/
    schema.sql

  public/
    demo/
      cart-bug-screenshot.png

  README.md
  .env.example
  package.json
```

---

# Environment Variables

```env
CEREBRAS_API_KEY=
CEREBRAS_BASE_URL=https://api.cerebras.ai/v1
CEREBRAS_MODEL=gemma-4-31b

NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

BASELINE_PROVIDER_ENABLED=false
GEMINI_API_KEY=
```

Important:

```text
Never expose CEREBRAS_API_KEY on the client.
Keep all model calls inside server routes.
```

---

# Database Schema

## incidents

```sql
create table incidents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  module text,
  status text default 'created',
  severity text,
  created_at timestamptz default now()
);
```

## incident_evidence

```sql
create table incident_evidence (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references incidents(id) on delete cascade,
  type text not null,
  content text,
  file_url text,
  created_at timestamptz default now()
);
```

## agent_runs

```sql
create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references incidents(id) on delete cascade,
  agent_name text not null,
  status text not null,
  latency_ms int,
  prompt_tokens int,
  completion_tokens int,
  total_tokens int,
  tokens_per_second numeric,
  output jsonb,
  created_at timestamptz default now()
);
```

---

# Cerebras Client Wrapper

```ts
// lib/cerebras/client.ts

import OpenAI from "openai";

export const cerebras = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY!,
  baseURL: process.env.CEREBRAS_BASE_URL || "https://api.cerebras.ai/v1",
});

export async function runGemmaAgent({
  messages,
  responseFormat,
  reasoningEffort = "none",
}: {
  messages: any[];
  responseFormat?: any;
  reasoningEffort?: "none" | "low" | "medium" | "high";
}) {
  const startedAt = Date.now();

  const response = await cerebras.chat.completions.create({
    model: process.env.CEREBRAS_MODEL || "gemma-4-31b",
    messages,
    reasoning_effort: reasoningEffort,
    response_format: responseFormat,
    temperature: 0.2,
  } as any);

  const latencyMs = Date.now() - startedAt;

  return {
    response,
    latencyMs,
    content: response.choices[0]?.message?.content,
    usage: response.usage,
    timeInfo: (response as any).time_info,
  };
}
```

---

# Image Handling

```ts
// lib/cerebras/image.ts

export async function fileToBase64DataUri(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");
  return `data:${file.type};base64,${base64}`;
}
```

For video, do not send the full video directly. Extract 3–5 frames:

```text
Frame 1: before action
Frame 2: clicked button
Frame 3: error/stuck state
Frame 4: optional network failure state
```

Then send those frames as image inputs.

---

# Agent Prompt Templates

## Vision Agent Prompt

```text
You are the Vision Triage Agent in an enterprise incident-response swarm.

Analyze the provided app screenshot or video frame.

Identify:
- screen type
- visible UI state
- visible error or missing error
- likely user action
- affected business flow
- severity signal
- confidence

Return only valid JSON.
```

## Log Agent Prompt

```text
You are the Log Analysis Agent.

Analyze the backend logs for:
- primary error
- failing service
- correlation ID
- timestamp
- repeated pattern
- likely failing function/module
- probable cause

Return only valid JSON.
```

## API Agent Prompt

```text
You are the API Contract Agent.

Analyze the API request and response.

Identify:
- endpoint
- HTTP status
- contract violation
- breaking field
- expected value
- actual value
- likely impact
- suggested backend/frontend fix

Return only valid JSON.
```

## DB Agent Prompt

```text
You are the DB Consistency Agent.

Analyze the provided DB snapshot.

Identify:
- suspicious tables
- inconsistent fields
- missing values
- possible data-mapping issue
- SQL queries required for validation

Return only valid JSON.
```

## RCA Agent Prompt

```text
You are the Root Cause Agent.

You receive outputs from the Vision Agent, Log Agent, API Agent, and DB Agent.

Your job:
- combine evidence
- produce 3 root-cause hypotheses
- rank them by confidence
- explain which evidence supports each
- identify missing evidence
- produce a final RCA summary

Return only valid JSON.
```

## Test Agent Prompt

```text
You are the Regression Test Agent.

Using the RCA and evidence, generate:
- manual QA reproduction steps
- SQL validation checks
- API regression test
- Postman assertions
- Karate-style test scenario
- edge cases that must be tested

Return only valid JSON.
```

## Release Judge Prompt

```text
You are the Release Risk Agent.

Decide whether the release should PASS, WARN, or BLOCK.

Consider:
- business impact
- affected flow
- severity
- confidence
- missing evidence
- available regression tests

Return:
- release_gate
- risk_score
- reason
- required_fixes
- recommended_tests

Return only valid JSON.
```

---

# Orchestration Logic

Run independent agents in parallel.

```text
Step 1:
Run Vision Agent, Log Agent, API Agent, and DB Agent in parallel.

Step 2:
Send their outputs to RCA Agent.

Step 3:
Send RCA output to Test Agent and Release Judge in parallel.

Step 4:
Send final outputs to Demo Narrator Agent.
```

Pseudo-code:

```ts
const [vision, logs, api, db] = await Promise.all([
  runVisionAgent(input),
  runLogAgent(input),
  runApiAgent(input),
  runDbAgent(input),
]);

const rca = await runRcaAgent({ vision, logs, api, db });

const [tests, release] = await Promise.all([
  runTestAgent({ rca, api, db }),
  runReleaseAgent({ rca, vision, logs }),
]);

const narrator = await runNarratorAgent({ rca, tests, release });
```

---

# MVP Feature List

Build these first:

```text
1. Upload screenshot
2. Paste logs
3. Paste API response
4. Paste DB snapshot
5. Run agent swarm
6. Show agent graph
7. Show final RCA
8. Generate Jira bug
9. Generate SQL/API regression tests
10. Show Cerebras speed metrics
11. Deploy on Vercel
```

Do not waste time on:

```text
Auth
Billing
Complex vector DB
Real Jira integration
Real GitHub integration
Complex permissions
Full video processing pipeline
```

---

# Stretch Features

Only after MVP works:

```text
1. Video upload → frame extraction
2. GitHub PR diff analyzer
3. Export Jira markdown
4. Download incident report as PDF
5. Slack-style incident timeline
6. Baseline comparison with Gemini
7. RAG from synthetic runbook
8. Ask follow-up chat over incident evidence
```

---

# 24-Hour Build Plan

## Hour 0–1: Setup

Create repo:

```bash
npx create-next-app@latest opsverse --ts --tailwind --eslint --app
cd opsverse
npm install openai zod lucide-react reactflow recharts @supabase/supabase-js
```

Add:

```text
.env.local
.env.example
README.md
```

Goal:

```text
One test API route calls Gemma 4 and returns response + latency.
```

---

## Hour 1–3: Build UI Shell

Pages:

```text
Landing page
Incident upload page
Dashboard page
```

Components:

```text
EvidenceUploader
AgentGraph
AgentCard
ResultTabs
SpeedMetrics
```

Goal:

```text
You can load sample incident and see the dashboard skeleton.
```

---

## Hour 3–5: Add Sample Incident Data

Create:

```text
cart-summary-failure.ts
return-tracking-confirmed-qty.ts
order-tracking-items-missing.ts
```

Each sample should contain:

```ts
export const sampleIncident = {
  title: "Unable to move from cart to order summary",
  module: "Direct Orders",
  logs: "...",
  apiResponse: "...",
  dbSnapshot: "...",
  gitDiff: "...",
};
```

Goal:

```text
Click “Load Demo Incident” and all fields populate.
```

---

## Hour 5–8: Implement Core Agents

Implement:

```text
Vision Agent
Log Agent
API Agent
DB Agent
RCA Agent
Test Agent
Release Agent
```

Goal:

```text
Run Swarm button produces structured outputs.
```

---

## Hour 8–10: Add Multimodal Screenshot Support

Add image upload.

Convert image to base64 data URI.

Send message:

```ts
messages: [
  {
    role: "user",
    content: [
      {
        type: "text",
        text: "Analyze this enterprise app screenshot for incident triage."
      },
      {
        type: "image_url",
        image_url: {
          url: base64DataUri
        }
      }
    ]
  }
]
```

Goal:

```text
Vision Agent reads uploaded screenshot and returns screen analysis.
```

---

## Hour 10–12: Agent Graph and Progress UI

Use React Flow or a custom graph.

Show states:

```text
Pending
Running
Complete
Failed
```

Each agent card should show:

```text
Latency
Tokens
Confidence
Output preview
```

Goal:

```text
Demo visibly shows multi-agent collaboration.
```

---

## Hour 12–14: Speed Metrics

Store:

```text
agent_name
latency_ms
prompt_tokens
completion_tokens
tokens_per_second
time_info
```

Show:

```text
Total swarm time
Fastest agent
Slowest agent
Total tokens
Approx tokens/sec
```

Goal:

```text
Judges can see Cerebras speed as part of the product.
```

---

## Hour 14–16: Enterprise Polish

Add final output tabs:

```text
Executive Summary
Root Cause
Jira Bug
Regression Tests
Release Gate
Evidence
```

Add copy buttons:

```text
Copy Jira Bug
Copy SQL Checks
Copy Karate Test
Copy Release Decision
```

Goal:

```text
Product feels useful to an actual QA/SRE/support team.
```

---

## Hour 16–18: Supabase Persistence

Save:

```text
incident
agent outputs
metrics
```

Goal:

```text
Dashboard URL can be refreshed without losing results.
```

---

## Hour 18–20: Deploy

Push to GitHub.

Deploy to Vercel.

Add env variables in Vercel:

```text
CEREBRAS_API_KEY
CEREBRAS_BASE_URL
CEREBRAS_MODEL
SUPABASE_URL
SUPABASE keys
```

Goal:

```text
Live public URL works.
```

---

## Hour 20–21: README

README sections:

```text
# OpsVerse
## Problem
## Why Gemma 4 on Cerebras
## Tracks
## Architecture
## Agent Swarm
## Multimodal Inputs
## Speed Metrics
## Demo
## Local Setup
## Environment Variables
## Security Notes
## Future Scope
```

---

# Scoring Checklist

## Track 1

```text
[x] Multiple agents visible
[x] Agents collaborate, not just run separately
[x] Screenshot/image input used
[x] Optional video frames used
[x] Cerebras speed visible
[x] Creative enterprise workflow
[x] Clear multimodal intelligence
[x] Strong visual demo
```

## Track 3

```text
[x] Clear business problem
[x] Production-ready architecture
[x] Secure env handling
[x] Structured JSON outputs
[x] Agent-level audit trail
[x] Stored incident history
[x] Deployable live app
[x] Enterprise impact explained
[x] Generates practical engineering outputs
```

---

# Final Build Priority

Build in this order:

```text
1. Cerebras wrapper working
2. Sample incident working
3. Agent outputs working
4. UI dashboard working
5. Multimodal screenshot working
6. Speed metrics working
7. Jira/tests/release output working
8. Deploy
```

---

# Final Positioning

## Main pitch

**OpsVerse is a multimodal incident-response swarm for enterprise engineering teams. It uses Gemma 4 on Cerebras to analyze screenshots, logs, API responses, DB snapshots, and Git diffs, then generates root cause analysis, Jira-ready bugs, regression tests, and release-risk decisions in seconds.**

## Why it matters

Enterprise teams lose time connecting scattered evidence during incidents. OpsVerse turns raw debugging artifacts into a coordinated engineering action plan.

## Why Cerebras matters

The product depends on fast multi-agent execution. Cerebras speed makes the swarm feel real-time instead of slow and sequential.

## Why Gemma 4 matters

Gemma 4 enables multimodal reasoning over screenshots and structured reasoning over logs, JSON, DB snapshots, and code diffs.

## Why this can win

It is not a toy demo. It is a realistic, production-style enterprise tool with visible multi-agent collaboration, multimodal input, useful outputs, speed metrics, and a deployable architecture.
