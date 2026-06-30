# OpsVerse Demo and Submission Runbook

This runbook prepares the recording and submission materials. It is not proof
that the demo was recorded, deployed, or submitted. Add real links only after
the live app, GitHub repository, and uploaded video have been verified.

## Verification Prerequisites

Complete these before recording or posting:

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run verify:secrets`
- `npm audit --audit-level=moderate`
- `npm run verify:ui` against a running local app
- `npm run verify:deployment` with a configured GitHub remote, GitHub CLI, and Vercel CLI
- `/api/runtime/status` must show the configured Gemma model is available for the current Cerebras key
- The primary sample must complete through the real swarm route, not static output
- Production URL must load the landing page and the incident workflow
- Production sample run must show real agent completion or explicit real provider failures
- Browser, logs, README, and commits must not expose private keys or private customer data

Current known blockers are tracked in `task.md`. Do not record or submit as a
finished product while the configured Gemma model, Supabase persistence, GitHub
remote, or Vercel deployment remain unverified.

## Recording Setup

- Target duration: under 60 seconds.
- Recording tool: Loom, Tella, OBS, or equivalent.
- Viewport: desktop width around 1440 px so the agent graph and result tabs fit.
- Data: only bundled synthetic samples or synthetic manual evidence.
- Do not show `.env.local`, terminal history with secrets, provider dashboards, or private account pages.
- Keep `/api/runtime/status` or the Runtime panel available for preflight, but do not expose secret values.

## 60-Second Script

```text
0-5 sec:
Enterprise teams lose hours connecting screenshots, logs, API failures, and DB evidence during incidents.

5-12 sec:
This is OpsVerse, a multimodal incident swarm powered by Gemma 4 on Cerebras.

12-25 sec:
Upload a bug screenshot, logs, API response, and DB snapshot. The swarm launches Vision, Log, API, DB, RCA, Test, and Release agents.

25-40 sec:
Within seconds, it identifies the broken cart-to-summary flow, finds the likely confirmedQty contract issue, and generates root cause hypotheses.

40-52 sec:
It creates a Jira-ready bug, SQL checks, API regression tests, and a release gate decision.

52-60 sec:
Cerebras speed makes this feel real-time: incident chaos becomes release-ready action before the meeting even starts.
```

## Shot List

1. Landing page
   - Show `OpsVerse - Multimodal Incident Swarm for Enterprise Apps`.
   - Show Gemma 4 on Cerebras positioning.

2. Upload/sample evidence
   - Click `Run Demo Incident`.
   - Show screenshot/frame evidence, logs, API JSON, DB snapshot, and Git diff fields.
   - Confirm the evidence is synthetic.

3. Run swarm
   - Click `Run Incident Swarm`.
   - Show the agent graph updating from real stream events.
   - Do not overlay or edit in fake successful states.

4. Results package
   - Show Summary, Root Cause, Tests, Jira Bug, and Release Gate tabs.
   - Show RCA hypotheses, reproduction steps, SQL checks, API expectations, Jira-ready bug, and release gate decision from the completed incident package.

5. Speed metrics
   - Show per-agent latency, token usage, and total runtime.
   - If provider metrics are unavailable, do not claim a successful speed result.

## Track 1 Discord Draft

Channel: `#g4hackathon-multiverse-agents`

```text
Project: OpsVerse - Multimodal Incident Swarm for Enterprise Apps

OpsVerse is a multi-agent and multimodal incident-response system powered by Gemma 4 on Cerebras.

It takes screenshots or video frames, logs, API responses, DB snapshots, and optional Git diffs, then coordinates specialized agents:
- Vision Triage Agent
- Log Analysis Agent
- API Contract Agent
- DB Consistency Agent
- Root Cause Agent
- Regression Test Agent
- Release Risk Agent
- Demo Narrator Agent

The output is a complete enterprise incident package: RCA, Jira-ready bug, reproduction steps, SQL checks, API regression tests, and release gate decision.

Cerebras speed is shown directly in the UI through per-agent latency, token usage, and total swarm runtime from completed provider responses.

Demo:
<verified demo video link>

Live app:
<verified Vercel production link>

GitHub:
<verified GitHub repository link>
```

## Track 3 Discord Draft

Channel: `#g4hackathon-enterprise-impact`

```text
Project: OpsVerse - Enterprise Incident Response with Gemma 4 on Cerebras

Enterprise engineering teams waste time connecting UI failures, logs, API errors, DB state, and release risk. OpsVerse turns this evidence into actionable incident intelligence.

Business impact:
- Faster incident triage
- Better QA handoff
- Auto-generated regression tests
- Jira-ready bug reports
- Release gate decisions
- Reduced production risk

Production-readiness:
- Server-side API key handling
- Structured outputs
- Agent-level audit trail
- Stored incident history when Supabase is configured
- Reproducible test generation
- Deployment-ready Next.js, Supabase, and Vercel architecture

Demo:
<verified demo video link>

Live app:
<verified Vercel production link>

GitHub:
<verified GitHub repository link>
```

## Optional X/Twitter Draft

Post only after the live app and demo video are verified.

```text
Built OpsVerse for the Cerebras x Google DeepMind Gemma 4 Hackathon.

It is a multimodal incident swarm: upload a bug screenshot, logs, API JSON, and DB snapshot, then Gemma 4 agents on Cerebras generate RCA, Jira bug, SQL checks, regression tests, and a release decision in seconds.

@Cerebras @googlegemma

Demo:
<verified demo video link>

Live app:
<verified Vercel production link>
```

## Final Link Checklist

Replace every placeholder only after verifying:

- `<verified demo video link>` points to the uploaded under-60-second recording.
- `<verified Vercel production link>` loads the deployed app and the primary sample workflow.
- `<verified GitHub repository link>` points to the repository pushed with the personal git account.
- The submission text does not claim Supabase persistence, production model success, or baseline benchmarks unless those paths were verified in the final deployed app.
