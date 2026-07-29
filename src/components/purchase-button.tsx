"use client";

import { useState } from "react";

export function PurchaseButton() {
  const [message, setMessage] = useState("");
  async function purchase() {
    const response = await fetch("/api/checkout", { method: "POST" });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) { window.location.assign("/signin?next=/pricing"); return; }
    if (response.ok && result.url) window.location.assign(result.url);
    else setMessage(result.error?.message ?? "Checkout is temporarily unavailable.");
  }
  return (
    <div>
      <button onClick={() => void purchase()} className="min-h-14 rounded-full bg-ink px-7 font-black text-white">Buy Cycle</button>
      {message && <p role="alert" className="mt-3 text-sm font-bold text-coral">{message}</p>}
    </div>
  );
}
