import test from "node:test";
import assert from "node:assert/strict";
import {
  finalIncidentPackageSchema,
  type FinalIncidentPackage,
} from "../src/lib/cerebras/schemas";
import { hasVisualEvidence } from "../src/lib/incident/visual-evidence";
import { buildIncidentTimeline } from "../src/lib/timeline/incident-timeline";
import { primaryIncidentSample } from "../src/lib/samples";

const frameDataUri =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

const packageWithVideoFrames: FinalIncidentPackage = finalIncidentPackageSchema.parse({
  incident: {
    title: primaryIncidentSample.title,
    module: primaryIncidentSample.module,
    screenshotNote: primaryIncidentSample.screenshotNote,
    screenshotDataUri: "",
    screenshotFileName: "",
    videoNote: primaryIncidentSample.videoNote,
    videoFrameDataUri: "",
    videoFrameDataUris: [frameDataUri, frameDataUri, frameDataUri],
    videoFileName: "cart-summary.mp4",
    logs: primaryIncidentSample.logs,
    apiResponse: primaryIncidentSample.apiResponse,
    dbSnapshot: primaryIncidentSample.dbSnapshot,
    gitDiff: primaryIncidentSample.gitDiff,
  },
  agent_runs: [
    {
      agent_name: "intake_agent",
      status: "complete",
      output: null,
      error: null,
      metrics: {
        latencyMs: 9,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        tokensPerSecond: null,
        timeInfo: null,
      },
    },
    {
      agent_name: "vision_agent",
      status: "failed",
      output: null,
      error: "Configured Gemma model is unavailable.",
      metrics: null,
    },
    {
      agent_name: "release_agent",
      status: "failed",
      output: null,
      error: "Release risk skipped because RCA and tests did not complete.",
      metrics: null,
    },
  ],
  outputs: {
    intake: null,
    vision: null,
    logs: null,
    api: null,
    db: null,
    rca: null,
    tests: null,
    release: null,
    narrator: null,
  },
});

test("visual evidence detection includes extracted video frame arrays", () => {
  assert.equal(hasVisualEvidence(packageWithVideoFrames.incident), true);
  assert.equal(
    hasVisualEvidence({
      screenshotDataUri: "",
      videoFrameDataUri: "",
      videoFrameDataUris: [],
    }),
    false,
  );
});

test("incident timeline is reconstructed from evidence and agent run state", () => {
  const events = buildIncidentTimeline(packageWithVideoFrames);
  const visual = events.find((event) => event.id === "evidence-visual");
  const vision = events.find((event) => event.id === "agent-vision_agent");
  const release = events.find((event) => event.id === "output-release");

  assert.equal(visual?.status, "complete");
  assert.match(visual?.detail ?? "", /3 frames/);
  assert.equal(vision?.status, "failed");
  assert.match(vision?.detail ?? "", /Gemma model is unavailable/);
  assert.equal(release?.status, "pending");
  assert.match(release?.detail ?? "", /Release decision is unavailable/);
});
