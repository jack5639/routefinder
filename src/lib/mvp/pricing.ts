export const cycleOffers = {
  "founding-launch": { amountPence: 2900, currency: "gbp", label: "Founding launch", limit: 50 },
  standard: { amountPence: 5900, currency: "gbp", label: "Standard", limit: null },
} as const;

export type CycleOfferCode = keyof typeof cycleOffers;

export function cyclePriceLabel(amountPence: number, currency = "gbp") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: 0 })
    .format(amountPence / 100);
}
