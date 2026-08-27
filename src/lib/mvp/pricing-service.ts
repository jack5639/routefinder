import "server-only";

import { getServerEnv } from "@/lib/env";
import { cycleOffers, type CycleOfferCode } from "@/lib/mvp/pricing";
import { evaluatePaymentConfiguration } from "@/lib/payment-configuration";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CurrentCycleOffer {
  offer: CycleOfferCode;
  amountPence: number;
  currency: "gbp";
  checkoutReady: boolean;
}

/** The payment_offers table is the server-owned price authority. */
export async function getCurrentCycleOffer(): Promise<CurrentCycleOffer> {
  let checkoutReady = false;
  try {
    const env = getServerEnv();
    checkoutReady = evaluatePaymentConfiguration({
      enabled: env.PAYMENTS_ENABLED,
      secretKey: env.STRIPE_SECRET_KEY,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
      expectedLivemode: env.STRIPE_EXPECTED_LIVEMODE,
    }).checkoutReady;
    const { data, error } = await createAdminClient().from("payment_offers").select("code,amount_pence,currency,allocation_limit,allocated_count,active").eq("active", true);
    if (!error && data) {
      const founding = data.find((offer) => offer.code === "founding-launch" && (offer.allocation_limit === null || offer.allocated_count < offer.allocation_limit));
      const offer = founding ?? data.find((candidate) => candidate.code === "standard");
      if (offer && (offer.code === "founding-launch" || offer.code === "standard") && offer.currency === "gbp") {
        return { offer: offer.code, amountPence: offer.amount_pence, currency: "gbp", checkoutReady };
      }
    }
  } catch {
    // Checkout stays unavailable if configuration or the authoritative price cannot be read.
  }
  return { offer: "standard", amountPence: cycleOffers.standard.amountPence, currency: "gbp", checkoutReady: false };
}
