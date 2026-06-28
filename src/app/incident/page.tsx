import { EvidenceUploader } from "@/components/evidence-uploader";
import { incidentSamples } from "@/lib/samples";

export default function IncidentPage() {
  return <EvidenceUploader samples={[...incidentSamples]} />;
}
