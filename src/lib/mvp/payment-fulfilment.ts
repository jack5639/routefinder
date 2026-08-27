import { z } from "zod";

import { launchApplicationCycle } from "@/lib/catalog/commercial/policy";

const offerSchema = z.enum(["founding-launch", "standard"]);

export const checkoutMetadataSchema = z.object({
  reservation_id: z.string().uuid(),
  user_id: z.string().uuid(),
  application_cycle: z.coerce.number().int().refine((value) => value === launchApplicationCycle),
  offer: offerSchema,
});

export type CheckoutMetadata = z.infer<typeof checkoutMetadataSchema>;

export function checkoutSessionIsPaid(input: {
  status: string | null | undefined;
  paymentStatus: string | null | undefined;
  currency: string | null | undefined;
  amountTotal: number | null | undefined;
  metadata: unknown;
}) {
  const metadata = checkoutMetadataSchema.safeParse(input.metadata);
  if (!metadata.success) return { ok: false as const, code: "invalid_metadata" };
  if (input.status !== "complete") return { ok: false as const, code: "checkout_not_complete" };
  if (input.paymentStatus !== "paid") return { ok: false as const, code: "payment_not_paid" };
  if (input.currency?.toLowerCase() !== "gbp") return { ok: false as const, code: "unexpected_currency" };
  if (typeof input.amountTotal !== "number" || !Number.isSafeInteger(input.amountTotal) || input.amountTotal <= 0) return { ok: false as const, code: "invalid_amount" };
  // The reservation locked by the transactional RPC, rather than a source
  // constant, is authoritative for offer and amount.
  return { ok: true as const, metadata: metadata.data };
}

export function isExpectedStripeMode(eventLiveMode: boolean, expectedLiveMode: boolean) {
  return eventLiveMode === expectedLiveMode;
}

/**
 * Stripe's created value is second-granular. At the same second, terminal
 * payment events win over a completion and every other tie is ignored.
 */
export function isNewerPaymentEvent(
  current: { createdAt: number; id: string; type?: string } | null | undefined,
  incoming: { createdAt: number; id: string; type?: string },
) {
  if (!current) return true;
  if (incoming.createdAt !== current.createdAt) return incoming.createdAt > current.createdAt;
  return incoming.type !== "checkout.session.completed" && current.type === "checkout.session.completed";
}
