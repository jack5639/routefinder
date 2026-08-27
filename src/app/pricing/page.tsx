import Link from "next/link";
import { PurchaseButton } from "@/components/purchase-button";
import { normaliseCampaignCode } from "@/lib/campaign";
import { cyclePriceLabel } from "@/lib/mvp/pricing";
import { getCurrentCycleOffer } from "@/lib/mvp/pricing-service";
import { PaywallBeacon } from "./paywall-beacon";

// Price and checkout availability come from the server-owned offer allocation.
export const dynamic = "force-dynamic";

const rows = [
  ["Saved reviewed opportunities", "Up to 5 active", "More saved opportunities"],
  ["Evidence examples", "Up to 10", "Unlimited"],
  ["Active applications", "Up to 5", "Up to 15"],
  ["Requirements-to-evidence view", "Basic", "Expanded"],
  ["This Week plan", "One refresh each month", "Continuous refreshes"],
];

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ campaign?: string }> }) {
  const campaign = normaliseCampaignCode((await searchParams).campaign);
  const currentOffer = await getCurrentCycleOffer();
  const isFounding = currentOffer.offer === "founding-launch";
  const price = cyclePriceLabel(currentOffer.amountPence, currentOffer.currency);
  return (
    <main className="min-h-screen bg-[linear-gradient(145deg,#fbf8ef,#eef8f1_46%,#dceeff)] px-4 py-12 text-ink sm:px-6">
      <PaywallBeacon campaign={campaign} />
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm font-black uppercase tracking-[0.14em] text-leaf">← Routefinder</Link>
        <header className="mt-12 text-center"><p className="text-sm font-black uppercase tracking-[0.16em] text-leaf">Simple cycle pricing</p><h1 className="mt-4 text-5xl font-black tracking-[-0.05em] sm:text-6xl">Start free. Expand when the work grows.</h1><p className="mx-auto mt-5 max-w-2xl font-semibold leading-7 text-ink/65">Free produces a useful starting strategy. Cycle is one payment for the rest of the intended entry cycle.</p></header>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <section className="rounded-[2rem] bg-white p-7 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-leaf">Free</p><p className="mt-3 text-4xl font-black">£0</p><p className="mt-2 font-semibold text-ink/55">No card required. A genuine first result and a useful workspace.</p><Link href={`/start${campaign ? `?campaign=${campaign}` : ""}`} className="mt-6 inline-flex min-h-14 items-center rounded-full border border-ink/15 px-7 font-black">Get my free first result</Link></section>
          <section className="rounded-[2rem] bg-mint p-7 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-leaf">Cycle · {isFounding ? "founding launch" : "standard"}</p><p className="mt-3 text-4xl font-black">{price}</p><p className="mt-2 font-semibold text-ink/55">{isFounding ? "The limited founding allocation is currently available." : "The founding allocation has ended."}</p><div className="mt-6"><PurchaseButton enabled={currentOffer.checkoutReady} /></div>{!currentOffer.checkoutReady ? <p className="mt-3 text-sm font-bold text-ink/60">Payments are closed or not fully configured. Free remains available.</p> : null}</section>
        </div>
        <div className="mt-6 overflow-x-auto rounded-[2rem] bg-white shadow-sm">
          <table className="w-full min-w-[620px] text-left text-sm">
            <caption className="sr-only">Comparison of Routefinder Free and Cycle</caption>
            <thead><tr><th scope="col" className="border-b border-ink/10 p-5">Feature</th><th scope="col" className="border-b border-ink/10 p-5">Free</th><th scope="col" className="border-b border-ink/10 p-5 text-leaf">Cycle</th></tr></thead>
            <tbody>{rows.map(([feature, free, cycle]) => <tr key={feature}><th scope="row" className="border-b border-ink/8 p-5 font-black">{feature}</th><td className="border-b border-ink/8 p-5 font-semibold text-ink/55">{free}</td><td className="border-b border-ink/8 p-5 font-bold text-leaf">{cycle}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="mt-6 space-y-3 rounded-2xl bg-white/65 p-5 text-sm font-semibold leading-6 text-ink/60">
          <p><strong className="text-ink">One payment, no automatic renewal.</strong> Cycle access supports 2027 entry and ends on 30 September 2027.</p>
          <p>Launch coverage is technology, engineering, business, and finance. Routefinder helps with comparison and preparation; providers and employers decide outcomes, and Routefinder does not submit applications.</p>
          <p>A parent or carer may pay, but payment does not give them access to the student workspace. Read the <Link href="/refunds" className="font-black text-leaf underline">refund policy</Link> or email <a href="mailto:support@routefinder.app" className="font-black text-leaf underline">support@routefinder.app</a> before checkout.</p>
          <p>£59 is the current standard-price hypothesis, not validated evidence of demand. Checkout always shows the authoritative current price before payment.</p>
        </div>
      </div>
    </main>
  );
}
