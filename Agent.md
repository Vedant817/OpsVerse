# OpsVerse Agent Operating Guide

This file defines how implementation agents must work in this repository. Use `task.md` as the source of truth for what is implemented, what remains open, and what should be built next.

## Prime Directive

Build OpsVerse end to end from `Idea.md` and track progress in `task.md`. Pick one coherent feature or subfeature at a time, implement it, verify it, update `task.md`, and commit it with the correct personal git identity.

Do not skip tracking. Do not make broad unverified claims. Do not commit with the work git account.

Everything implemented for OpsVerse must move toward a realtime, production-level working product. Do not build fake flows, hardcoded AI results, scripted demo-only paths, placeholder business logic, or AI-generated filler that makes the project look functional without actually being functional. Sample data is allowed for the demo, but the application path must be real: intake, validation, agent execution, persistence, dashboard rendering, error states, and metrics must be wired through actual code.

## Production and Realtime Standard

Agents must treat production readiness as a hard requirement, not a polish task.

Required standards:

- Build realtime or near-realtime user feedback for long-running work. The swarm should show actual pending/running/complete/failed states, not a fixed animation pretending work happened.
- Use real API routes, real server-side model calls, real validation, real persistence when configured, and real error handling.
- Keep demo/sample data clearly separate from runtime logic.
- Make sample incidents load through the same intake and orchestration path that uploaded evidence uses.
- Return structured outputs from actual agent execution. Do not paste static RCA/Jira/test/release text as if it came from the swarm.
- Store and display actual latency, token usage, and provider timing when available. Do not hardcode speed metrics.
- If a provider key, database, or external service is missing, fail clearly with an actionable error or enter an explicitly labeled demo/mock mode.
- Demo/mock mode must be opt-in, visibly labeled, and never described as production or live AI behavior.
- Use schemas and validation for external inputs, model outputs, API payloads, and persistence writes.
- Implement empty, loading, success, and failure states for user-facing workflows.
- Avoid brittle code that only works for the primary sample. The system should accept arbitrary valid synthetic incident evidence.
- Do not hide failures. Surface failed agents, invalid model JSON, failed database writes, and missing environment variables.
- Do not commit generated nonsense, vague AI copy, fake testimonials, fake integrations, or claims that are not backed by working code.

Completion rule: no task may be marked `[x]` in `task.md` if it is only hardcoded, only visually mocked, only a static demo, or only works because output text was prefilled. Mark it `[~]` or `[!]` and explain the missing real implementation.

## Required Starting Routine

At the start of every implementation turn:

1. Read `task.md`.
2. Read the relevant section of `Idea.md` for the feature being implemented.
3. Check the current repo state:

```bash
git status --short
git config --local user.name
git config --local user.email
```

4. If the repo is not initialized, initialize it only when implementation work is about to be committed:

```bash
git init
```

5. Configure repo-local git identity to the user's personal account before committing.

Important: the global git email may be the work email `vedant.mahajan@salescode.ai`. That email must not be used for commits in this project.

Use this pattern after the user provides or confirms the personal git identity:

```bash
git config --local user.name "<PERSONAL_GIT_NAME>"
git config --local user.email "<PERSONAL_GIT_EMAIL>"
git config --local user.name
git config --local user.email
```

Fail closed: if `git config --local user.email` is empty or shows `vedant.mahajan@salescode.ai`, do not commit. Stop and ask for the personal git email.

## How to Pick Work

Use this order:

1. Pick the first incomplete high-priority item from `task.md`.
2. Prefer MVP tasks over stretch tasks.
3. Prefer dependencies before dependents.
4. Prefer a working vertical slice over disconnected UI.
5. Avoid non-goals until the MVP is complete.

Default build priority:

1. Git/repo identity bootstrap.
2. Next.js scaffold.
3. Environment validation.
4. Cerebras wrapper.
5. Sample incident data.
6. Incident upload flow.
7. Agent implementations.
8. Orchestrator.
9. Results dashboard.
10. Multimodal screenshot support.
11. Speed metrics.
12. Supabase persistence.
13. README.
14. Deployment.
15. Demo and submission.

## How to Break Down Features

Before editing, break the selected feature into small tasks. For each task:

- Define the files expected to change.
- Define the user-visible behavior.
- Define the real runtime path that proves it is not hardcoded.
- Define the verification command or manual check.
- Define the commit boundary.

For large features, split into sub-tasks that can each be committed independently. Example:

Feature: agent swarm

- Subtask 1: Add schemas and shared agent result types.
- Subtask 2: Add Cerebras client wrapper.
- Subtask 3: Add Log/API/DB agents.
- Subtask 4: Add RCA/Test/Release agents.
- Subtask 5: Add orchestrator dependency flow.
- Subtask 6: Wire API route and UI action.
- Subtask 7: Add progress states and metrics display.

Each subtask should leave the repo in a runnable state whenever possible.

## Task Tracking Rules

After every implementation slice:

1. Update `task.md`.
2. Change only statuses that are actually affected.
3. Add verification evidence for completed work when useful.
4. Mark blocked items with `[!]` and a short reason.
5. Do not mark a task `[x]` unless it is implemented and verified.
6. Keep newly discovered work in the correct section, or add a new section if needed.

Status usage:

- `[ ]` Not started
- `[~]` In progress
- `[x]` Done and locally verified
- `[!]` Blocked or needs external input

## Commit Rules

Commit after each coherent subtask.

Before each commit:

```bash
git status --short
git config --local user.email
```

Do not commit if the local email is missing or is the work email.

Use concise, specific commit messages:

```text
docs: add implementation tracker
chore: scaffold next app
feat: add cerebras client wrapper
feat: add sample incident loader
feat: implement core incident agents
feat: add swarm orchestration route
feat: render incident results dashboard
feat: persist agent runs in supabase
docs: document local setup and demo flow
```

Commit boundaries:

- Keep docs-only changes separate when practical.
- Keep scaffold/config changes separate from feature logic.
- Keep backend agent logic separate from UI rendering when both are large.
- Commit `task.md` updates with the code they describe.

Never commit:

- `.env.local`
- API keys
- generated secrets
- private company data
- local-only build artifacts
- fake production evidence

## Verification Rules

Run the most relevant verification after each slice.

Once scripts exist, prefer:

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

If the project uses pnpm, use:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

For UI work:

- Start the dev server.
- Open the affected page.
- Verify the primary workflow manually or with browser automation.
- Check that mobile and desktop layouts do not overlap.
- Confirm data shown in the UI comes from state, API responses, database records, or validated sample fixtures, not from hidden hardcoded final outputs.

For API/agent work:

- Exercise the route with sample evidence.
- Verify structured JSON shape.
- Verify error handling for missing env vars.
- Verify no server secrets appear in client output.
- Change one input field in the evidence and confirm the output path responds to that changed input.
- Confirm failed model calls or invalid model JSON produce visible failed-agent states.

For Cerebras work:

- Use the real server-side API path when `CEREBRAS_API_KEY` is configured.
- If using mock/sample mode, label it clearly in UI and task notes.
- Do not claim live model success unless a real call was made.
- Do not hardcode RCA, Jira, SQL, regression tests, release gates, latency, tokens, or throughput as if generated by Cerebras.

For persistence work:

- Create an incident.
- Save evidence.
- Save agent outputs.
- Refresh dashboard URL.
- Verify results reload.
- Confirm saved records contain the actual evidence and agent outputs from the run, not static fixture output.

## Product Constraints

OpsVerse must remain focused on the hackathon idea:

- Multimodal incident response.
- Multi-agent collaboration.
- Enterprise app debugging.
- Gemma 4 on Cerebras as the central model.
- Real speed metrics from Cerebras where possible.
- Actionable outputs: RCA, Jira bug, SQL checks, API tests, release gate.

Do not turn the project into:

- A generic chatbot.
- A document Q&A app.
- A static landing page only.
- A fake demo with no working incident flow.
- A scripted showcase where buttons reveal prewritten results.
- A broad SRE platform without the core hackathon workflow.
- A pile of AI-generated UI/copy that does not execute the real product workflow.

## Data and Safety Rules

- Use only synthetic/sample data.
- Do not include real company screenshots, logs, API payloads, DB rows, customer names, or private incidents.
- Keep `CEREBRAS_API_KEY` server-side only.
- Keep Supabase service role server-side only.
- Never commit `.env.local`.
- Clearly label sample evidence as synthetic.
- Clearly label mocked model output if a mock is used.
- Do not use mock output when real environment variables are configured unless explicitly testing mock mode.
- Do not mix private or real customer evidence into screenshots, logs, JSON, database snapshots, commits, README, demo video, or submission posts.

## MVP Definition of Done

The MVP is done only when all of this works:

- User can load the cart summary failure sample.
- User can upload or view screenshot evidence.
- User can paste logs, API JSON, DB snapshot, and optional git diff.
- User can run the incident swarm.
- Vision, Log, API, DB, RCA, Test, and Release agents produce structured outputs.
- Agent outputs are generated through the orchestrator path, not pasted from static final-result fixtures.
- Dashboard shows summary, root cause, evidence, tests, Jira bug, release gate, and speed metrics.
- Cerebras latency/token metrics are visible and come from actual provider responses when the key is configured.
- Outputs can be copied.
- Failures are visible and recoverable without crashing the app.
- App builds successfully.
- README explains setup, architecture, environment variables, and demo flow.

## Deployment Definition of Done

Deployment is done only when:

- GitHub repo exists and commits use the personal git identity.
- Vercel deployment succeeds.
- Required environment variables are configured.
- Live URL loads.
- Primary sample incident works on the live URL.
- No secrets are exposed.
- README includes the live URL only after it is verified.

## Demo Definition of Done

Demo is done only when:

- Video is under 60 seconds.
- It shows the actual app.
- It shows evidence loading.
- It shows the agent swarm running.
- It shows RCA, Jira bug, SQL checks, tests, release decision, and speed metrics.
- It mentions Gemma 4 on Cerebras.
- It uses only synthetic data.

## Communication Rules for Agents

When reporting progress:

- State what was implemented.
- State what was verified.
- State whether verification used live Cerebras/Supabase services or labeled local/demo mode.
- State what remains next in `task.md`.
- State any blockers clearly.
- If a check was not run, say why.

Do not say "fully working" unless the full MVP definition of done has been verified.
Do not say "realtime", "production-ready", "live AI", or "end to end" unless the actual realtime/product path has been exercised and the evidence is stated.

## Current Known Blocker

This folder was not a git repository when `Agent.md` was created, and the only visible global git identity was the work email `vedant.mahajan@salescode.ai`. Future agents must configure a repo-local personal git identity before making commits.
