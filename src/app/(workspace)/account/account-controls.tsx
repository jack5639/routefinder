"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cyclePriceLabel, type CycleOfferCode } from "@/lib/mvp/pricing";

export function AccountControls({ currentOffer }: { currentOffer: { offer: CycleOfferCode; amountPence: number; currency: "gbp"; checkoutReady: boolean } }) {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState(params.get("purchase") === "success" ? "Cycle purchase received. Your entitlement will appear when payment confirmation completes." : "");

  async function purchase() {
    const response = await fetch("/api/checkout", { method: "POST" });
    const result = await response.json().catch(() => ({}));
    if (response.ok && result.url) window.location.assign(result.url);
    else setMessage(result.error?.message ?? "Checkout is temporarily unavailable.");
  }

  async function importPrototype() {
    const raw = window.localStorage.getItem("routefinder.quizAnswers.v1");
    if (!raw) { setMessage("No valid prototype readiness data was found in this browser."); return; }
    let payload: unknown;
    try { payload = JSON.parse(raw); } catch { setMessage("The saved prototype data is invalid and was not imported."); return; }
    const response = await fetch("/api/account/import-prototype", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? (result.duplicate ? "This exact prototype data was already imported." : "Prototype answers imported. Review every unknown field in readiness.") : result.error?.message ?? "Prototype data could not be imported.");
  }

  async function remove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/account/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation: form.get("confirmation") }) });
    const result = await response.json().catch(() => ({}));
    if (response.ok) { router.push("/"); router.refresh(); }
    else setMessage(result.error?.message ?? "Account deletion is temporarily unavailable.");
  }

  return (
    <div className="space-y-5">
      {message && <p role="status" className="rounded-2xl bg-sky p-4 font-bold">{message}</p>}
      <section className="rounded-[2rem] bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-leaf">Routefinder Cycle</p>
        <h2 className="mt-2 text-2xl font-black">More room for a full application cycle</h2>
        <p className="mt-3 max-w-2xl font-semibold leading-7 text-ink/60">Unlimited saved opportunities and evidence, up to 15 active applications, complete mappings, and continuous weekly planning. One payment; access ends on 30 September following your entry year.</p>
        <button disabled={!currentOffer.checkoutReady} onClick={() => void purchase()} className="mt-5 min-h-12 rounded-full bg-ink px-6 font-black text-white disabled:cursor-not-allowed disabled:opacity-55">{currentOffer.checkoutReady ? `Buy Cycle — ${cyclePriceLabel(currentOffer.amountPence, currentOffer.currency)}` : "Checkout unavailable"}</button>
        <p className="mt-2 text-xs font-semibold text-ink/50">{currentOffer.offer === "founding-launch" ? "Founding allocation currently available; £59 after it ends." : "The founding allocation has ended."} Checkout confirms the current price before payment.</p>
      </section>
      <section className="rounded-[2rem] bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black">Your data</h2>
        <p className="mt-3 font-semibold leading-7 text-ink/60">Download every user-owned record as JSON. The file may contain personal application information, so store it carefully.</p>
        <a href="/api/account/export" className="mt-5 inline-flex min-h-12 items-center rounded-full border border-ink/15 px-6 font-black">Download JSON export</a>
      </section>
      <section className="rounded-[2rem] bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black">Import prototype answers</h2>
        <p className="mt-3 font-semibold leading-7 text-ink/60">This only runs when you choose it. Subjects import with unknown qualification types and grades, so you must review them. Your browser data is not deleted.</p>
        <button onClick={() => void importPrototype()} className="mt-5 min-h-12 rounded-full border border-ink/15 px-6 font-black">Import from this browser</button>
      </section>
      <section className="rounded-[2rem] border border-coral/25 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black">Delete account</h2>
        <p className="mt-3 font-semibold leading-7 text-ink/60">This removes your account and student-owned records. Payment event IDs and anonymised operational records may be retained where needed for fraud, tax, dispute, or legal obligations.</p>
        <form onSubmit={remove} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="font-black">Type DELETE<input required name="confirmation" className="ml-0 mt-2 min-h-12 rounded-2xl border border-coral/30 px-4 sm:ml-3 sm:mt-0" /></label>
          <button className="min-h-12 rounded-full bg-coral px-6 font-black text-white">Permanently delete</button>
        </form>
      </section>
      <form action="/auth/signout" method="post">
        <button className="min-h-12 rounded-full border border-ink/15 bg-white px-6 font-black">Sign out</button>
      </form>
    </div>
  );
}
