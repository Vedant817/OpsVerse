import type { IncidentSample } from "./types";

export const cartSummaryFailure: IncidentSample = {
  id: "cart-summary-failure",
  label: "Cart Summary Failure",
  title: "Unable to move from cart to order summary",
  module: "Direct Orders",
  scenario:
    "A field-sales cart remains on the cart page after Proceed to Summary is selected.",
  screenshotNote:
    "Synthetic screenshot evidence: cart page has SKU 13321 and SKU 14498 in the cart, Proceed to Summary was selected, the user remains on the cart page, and no frontend error is visible.",
  videoNote:
    "Frame 1: cart contains two SKUs. Frame 2: Proceed to Summary selected. Frame 3: cart still visible with no inline error.",
  apiResponse: JSON.stringify(
    {
      endpoint: "/api/cart/summary",
      status: 422,
      error: "Validation failed",
      details: [
        {
          field: "items[0].confirmedQty",
          message: "Expected number, received null",
        },
      ],
    },
    null,
    2,
  ),
  logs: `2026-06-28T18:45:21Z ERROR order-service
CorrelationId=req-8f32
CartSummaryValidationException: confirmedQty cannot be null for SKU 13321
at CartSummaryValidator.validate(CartSummaryValidator.java:87)
at CartSummaryService.buildSummary(CartSummaryService.java:142)`,
  dbSnapshot: `outlet_code,sku_code,available_qty,confirmed_qty,case_qty,piece_qty
1000023,13321,50,,1,12
1000023,14498,30,0,0,6`,
  gitDiff: `- confirmedQty: item.confirmedQty ?? 0
+ confirmedQty: item.confirmedQty`,
};
