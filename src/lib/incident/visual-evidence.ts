import type { IncidentEvidence } from "@/lib/cerebras/schemas";

export function hasVisualEvidence(incident: Pick<
  IncidentEvidence,
  "screenshotDataUri" | "videoFrameDataUri" | "videoFrameDataUris"
>) {
  return Boolean(
    incident.screenshotDataUri ||
      incident.videoFrameDataUri ||
      incident.videoFrameDataUris.length > 0,
  );
}
