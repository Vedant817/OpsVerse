import { cartSummaryFailure } from "./cart-summary-failure";
import { orderTrackingItemsMissing } from "./order-tracking-items-missing";
import { returnTrackingConfirmedQty } from "./return-tracking-confirmed-qty";

export type { IncidentSample } from "./types";

export const incidentSamples = [
  cartSummaryFailure,
  returnTrackingConfirmedQty,
  orderTrackingItemsMissing,
] as const;

export const primaryIncidentSample = cartSummaryFailure;
