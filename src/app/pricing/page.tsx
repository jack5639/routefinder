import Link from "next/link";
import { PurchaseButton } from "@/components/purchase-button";
import { cyclePriceLabel } from "@/lib/mvp/pricing";
import { getCurrentCycleOffer } from "@/lib/mvp/pricing-service";

// Price and checkout availability come from the server-owned offer allocation.
export const dynamic = "force-dynamic";

const rows = [
  ["Active opportunities", "5", "Unlimited saved; 15 active applications"],
  ["Evidence items", "10", "Unlimited"],
  ["Gap map and tracker", "Basic", "Complete mappings"],
  ["This Week refresh", "Once each month", "Continuous"],
];

export default async function PricingPage() {
  const currentOffer = await getCurrentCycleOffer();
  const isFounding = currentOffer.offer === "founding-launch";
  const price = cyclePriceLabel(currentOffer.amountPence, currentOffer.currency);
  return (
    <main className="min-h-screen bg-[linear-gradient(145deg,#fbf8ef,#eef8f1_46%,#dceeff)] px-4 py-12 text-ink sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm font-black uppercase tracking-[0.14em] text-leaf">← Routefinder</Link>
        <header className="mt-12 text-center"><p className="text-sm font-black uppercase tracking-[0.16em] text-leaf">Simple cycle pricing</p><h1 className="mt-4 text-5xl font-black tracking-[-0.05em] sm:text-6xl">Start free. Expand when the work grows.</h1><p className="mx-auto mt-5 max-w-2xl font-semibold leading-7 text-ink/65">Free produces a useful starting strategy. Cycle is one payment for the rest of the intended entry cycle.</p></header>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <section className="rounded-[2rem] bg-white p-7 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-leaf">Free</p><p className="mt-3 text-4xl font-black">£0</p><p className="mt-2 font-semibold text-ink/55">No card required</p><Link href="/signin?next=/readiness" className="mt-6 inline-flex min-h-14 items-center rounded-full border border-ink/15 px-7 font-black">Start readiness</Link></section>
          <section className="rounded-[2rem] bg-mint p-7 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-leaf">Cycle · {isFounding ? "founding launch" : "standard"}</p><p className="mt-3 text-4xl font-black">{price}</p><p className="mt-2 font-semibold text-ink/55">{isFounding ? "Founding allocation currently available; £59 after it ends." : "The founding allocation has ended."}</p><div className="mt-6"><PurchaseButton enabled={currentOffer.checkoutReady} /></div></section>
        </div>
        <div className="mt-6 overflow-hidden rounded-[2rem] bg-white shadow-sm">
          {rows.map(([feature, free, cycle]) => <div key={feature} className="grid grid-cols-[1.2fr_0.8fr_1.2fr] gap-3 border-b border-ink/8 p-4 text-sm last:border-0 sm:p-5"><strong>{feature}</strong><span className="font-semibold text-ink/55">{free}</span><span className="font-bold text-leaf">{cycle}</span></div>)}
        </div>
        <p className="mt-6 text-center text-sm font-semibold leading-6 text-ink/55">Cycle access ends on 30 September following your intended entry year. Refund and billing support terms are available before checkout.</p>
      </div>
    </main>
  );
}
