export type PaymentState = "active" | "refunded" | "disputed";

export function shouldApplyPaymentEvent(currentEventCreatedAt: number | null | undefined, incomingEventCreatedAt: number) {
  return incomingEventCreatedAt >= (currentEventCreatedAt ?? 0);
}

export function paymentStateForEvent(eventType: string): PaymentState | null {
  if (eventType === "checkout.session.completed") return "active";
  if (eventType === "charge.refunded") return "refunded";
  if (eventType === "charge.dispute.created") return "disputed";
  return null;
}
