import { z } from "zod";

import { cycleOffers, type CycleOfferCode } from "@/lib/mvp/pricing";

const offerSchema = z.enum(["founding-launch", "standard"]);

export const checkoutMetadataSchema = z.object({
  reservation_id: z.string().uuid(),
  user_id: z.string().uuid(),
  application_cycle: z.coerce.number().int().min(2026).max(2032),
  offer: offerSchema,
});

export type CheckoutMetadata = z.infer<typeof checkoutMetadataSchema>;

export function expectedOffer(offer: CycleOfferCode) {
  return cycleOffers[offer];
}

export function checkoutSessionIsPaid(input: {
  paymentStatus: string | null | undefined;
  currency: string | null | undefined;
  amountTotal: number | null | undefined;
  metadata: unknown;
}) {
  const metadata = checkoutMetadataSchema.safeParse(input.metadata);
  if (!metadata.success) return { ok: false as const, code: "invalid_metadata" };
  const expected = expectedOffer(metadata.data.offer);
  if (input.paymentStatus !== "paid") return { ok: false as const, code: "payment_not_paid" };
  if (input.currency?.toLowerCase() !== expected.currency) return { ok: false as const, code: "unexpected_currency" };
  if (input.amountTotal !== expected.amountPence) return { ok: false as const, code: "unexpected_amount" };
  return { ok: true as const, metadata: metadata.data, expected };
}

export function isExpectedStripeMode(eventLiveMode: boolean, expectedLiveMode: boolean) {
  return eventLiveMode === expectedLiveMode;
}

/** Stripe's created value is second-granular, so event id is a deterministic tie-breaker. */
export function isNewerPaymentEvent(
  current: { createdAt: number; id: string } | null | undefined,
  incoming: { createdAt: number; id: string },
) {
  if (!current) return true;
  return incoming.createdAt > current.createdAt
    || (incoming.createdAt === current.createdAt && incoming.id > current.id);
}
