import type { IncidentSample } from "./types";

export const returnTrackingConfirmedQty: IncidentSample = {
  id: "return-tracking-confirmed-qty",
  label: "Return Tracking Qty Bug",
  title: "Return tracking shows blank confirmed quantity after scan",
  module: "Returns / Tracking",
  scenario:
    "A return order accepts scanned items but the confirmed quantity column is blank before submission.",
  screenshotNote:
    "Synthetic screenshot evidence: return tracking table lists scanned SKUs, the confirmed quantity cell is empty for SKU 88231, and the Submit Return button is enabled.",
  videoNote:
    "Frame 1: return tracking screen before scan. Frame 2: barcode scan succeeds. Frame 3: confirmed quantity remains blank.",
  apiResponse: JSON.stringify(
    {
      endpoint: "/api/returns/tracking/confirm",
      status: 200,
      data: {
        returnId: "RET-2048",
        items: [
          {
            skuCode: "88231",
            scannedQty: 2,
            confirmedQty: null,
          },
        ],
      },
    },
    null,
    2,
  ),
  logs: `2026-06-28T19:12:04Z WARN return-service
CorrelationId=req-ret-2048
ReturnTrackingMapper: confirmedQty missing after scan event for returnId=RET-2048 sku=88231
at ReturnTrackingMapper.toResponse(ReturnTrackingMapper.java:53)`,
  dbSnapshot: `return_id,sku_code,scanned_qty,confirmed_qty,reason_code,status
RET-2048,88231,2,,DAMAGED,SCANNED
RET-2048,55210,1,1,EXPIRED,SCANNED`,
  gitDiff: `- confirmedQty: scan.confirmedQty ?? scan.scannedQty
+ confirmedQty: scan.confirmedQty`,
};
