import type { IncidentSample } from "./types";

export const orderTrackingItemsMissing: IncidentSample = {
  id: "order-tracking-items-missing",
  label: "Order Tracking Items Missing",
  title: "Order tracking opens without line items",
  module: "Order Tracking",
  scenario:
    "An order tracking detail page opens for a submitted order, but line items are missing from the response.",
  screenshotNote:
    "Synthetic screenshot evidence: order header is visible for ORD-7781, status is Submitted, but the items table shows an empty state.",
  videoNote:
    "Frame 1: order list contains ORD-7781. Frame 2: order row selected. Frame 3: detail page opens with no line items.",
  apiResponse: JSON.stringify(
    {
      endpoint: "/api/orders/ORD-7781/tracking",
      status: 200,
      data: {
        orderId: "ORD-7781",
        outletCode: "1000023",
        status: "SUBMITTED",
        items: [],
      },
    },
    null,
    2,
  ),
  logs: `2026-06-28T20:03:44Z ERROR order-tracking-service
CorrelationId=req-ord-7781
OrderTrackingItemsMissingException: no item rows returned for submitted order ORD-7781
at OrderTrackingRepository.findItems(OrderTrackingRepository.java:119)
at OrderTrackingService.getDetails(OrderTrackingService.java:61)`,
  dbSnapshot: `order_id,outlet_code,sku_code,ordered_qty,line_status
ORD-7781,1000023,13321,1,SUBMITTED
ORD-7781,1000023,14498,6,SUBMITTED`,
  gitDiff: `- where order_id = :orderId
+ where parent_order_id = :orderId`,
};
