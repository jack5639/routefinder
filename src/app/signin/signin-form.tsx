"use client";

import { useState } from "react";

export function SignInForm({ nextPath, campaign }: { nextPath: string; campaign?: string }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    const response = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, nextPath, ...(campaign ? { campaign } : {}) }),
    });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Check your email for a secure sign-in link." : result.error?.message ?? "A sign-in link could not be sent.");
    setSubmitting(false);
  }

  return (
    <form onSubmit={submit} className="mt-7">
      <label htmlFor="email" className="text-sm font-black">
        Email address
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="mt-2 min-h-14 w-full rounded-2xl border-2 border-ink/10 bg-white px-4 py-3 font-semibold outline-none focus:border-leaf"
        placeholder="you@example.com"
      />
      <button
        type="submit"
        disabled={submitting}
        className="mt-4 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-ink px-6 py-4 font-black text-white transition hover:bg-leaf disabled:opacity-60"
      >
        {submitting ? "Sending secure link…" : "Email me a sign-in link"}
      </button>
      {message ? (
        <p className="mt-4 rounded-xl bg-sky px-4 py-3 text-sm font-bold leading-6 text-ink/70" aria-live="polite">
          {message}
        </p>
      ) : null}
    </form>
  );
}
