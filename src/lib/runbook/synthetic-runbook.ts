import type { FinalIncidentPackage, IncidentEvidence } from "@/lib/cerebras/schemas";

export type RunbookEntry = {
  id: string;
  title: string;
  service: string;
  tags: string[];
  symptoms: string[];
  diagnosticChecks: string[];
  remediationSteps: string[];
  escalationOwner: string;
};

export type RunbookMatch = RunbookEntry & {
  score: number;
  matchedTerms: string[];
  reason: string;
};

export const syntheticRunbookEntries: RunbookEntry[] = [
  {
    id: "direct-orders-cart-summary-null-quantity",
    title: "Direct Orders cart summary blocked by null quantity",
    service: "order-service",
    tags: [
      "direct orders",
      "cart",
      "summary",
      "confirmedqty",
      "confirmed_qty",
      "sku",
      "422",
      "validation",
    ],
    symptoms: [
      "Proceed to Summary keeps the user on the cart page.",
      "Cart summary API rejects a line item because confirmedQty is null.",
      "No frontend error is visible to the field-sales user.",
    ],
    diagnosticChecks: [
      "Check /api/cart/summary response details for items[*].confirmedQty.",
      "Query ck_stock and ck_cart_items for the affected outlet and SKUs.",
      "Compare mapper changes for removed null coalescing or default quantity handling.",
    ],
    remediationSteps: [
      "Restore explicit confirmedQty defaulting or reject null values before summary generation.",
      "Render backend validation errors in the cart UI.",
      "Add regression tests for null, zero, and numeric confirmedQty values.",
    ],
    escalationOwner: "Backend validation + frontend cart owner",
  },
  {
    id: "order-tracking-items-missing",
    title: "Order tracking omits items after search filter change",
    service: "tracking-service",
    tags: ["order tracking", "items", "search", "filter", "empty", "order_id"],
    symptoms: [
      "Order tracking page opens but item rows are missing.",
      "Search filter returns an empty item array for a valid order.",
    ],
    diagnosticChecks: [
      "Verify order_id filter binding and pagination defaults.",
      "Compare item query joins before and after the filter change.",
    ],
    remediationSteps: [
      "Restore order item join conditions.",
      "Add a regression case for orders with multiple item rows.",
    ],
    escalationOwner: "Tracking API owner",
  },
  {
    id: "return-tracking-confirmed-quantity",
    title: "Return tracking confirmed quantity mismatch",
    service: "returns-service",
    tags: ["return", "tracking", "confirmedqty", "scannedqty", "quantity", "mapper"],
    symptoms: [
      "Return tracking shows confirmed quantity that does not match scanned quantity.",
      "Mapper falls back to a stale quantity field.",
    ],
    diagnosticChecks: [
      "Inspect return scan payloads for confirmedQty and scannedQty.",
      "Validate mapper precedence for return quantities.",
    ],
    remediationSteps: [
      "Use scanned quantity as the source of truth when confirmed quantity is absent.",
      "Add mapper tests for absent, null, and zero quantity values.",
    ],
    escalationOwner: "Returns workflow owner",
  },
];

const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "into",
  "when",
  "user",
  "null",
  "page",
  "opens",
]);

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]+/g, " ").trim();
}

function tokens(value: string) {
  return normalize(value)
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !stopWords.has(token));
}

function incidentSearchText(incident: IncidentEvidence) {
  return [
    incident.title,
    incident.module,
    incident.screenshotNote,
    incident.videoNote,
    incident.logs,
    incident.apiResponse,
    incident.dbSnapshot,
    incident.gitDiff,
  ].join("\n");
}

function scoreEntry(entry: RunbookEntry, incidentText: string) {
  const normalizedIncident = normalize(incidentText);
  const matchedTerms: string[] = [];
  let score = 0;

  for (const tag of entry.tags) {
    const normalizedTag = normalize(tag);
    if (normalizedTag && normalizedIncident.includes(normalizedTag)) {
      matchedTerms.push(tag);
      score += normalizedTag.includes(" ") ? 4 : 3;
      continue;
    }

    const tagTokens = tokens(tag);
    const tokenHits = tagTokens.filter((token) =>
      normalizedIncident.includes(token),
    );
    if (tokenHits.length > 0) {
      matchedTerms.push(...tokenHits);
      score += tokenHits.length;
    }
  }

  for (const symptom of entry.symptoms) {
    const symptomHits = tokens(symptom).filter((token) =>
      normalizedIncident.includes(token),
    );
    score += Math.min(symptomHits.length, 4);
    matchedTerms.push(...symptomHits);
  }

  return {
    score,
    matchedTerms: [...new Set(matchedTerms)].sort(),
  };
}

export function retrieveRunbookMatches(
  incident: IncidentEvidence,
  limit = 3,
): RunbookMatch[] {
  const searchText = incidentSearchText(incident);

  return syntheticRunbookEntries
    .map((entry) => {
      const scored = scoreEntry(entry, searchText);
      return {
        ...entry,
        score: scored.score,
        matchedTerms: scored.matchedTerms,
        reason:
          scored.matchedTerms.length > 0
            ? `Matched ${scored.matchedTerms.slice(0, 5).join(", ")} in supplied incident evidence.`
            : "No direct evidence overlap detected.",
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function retrieveRunbookMatchesForPackage(result: FinalIncidentPackage) {
  return retrieveRunbookMatches(result.incident);
}
