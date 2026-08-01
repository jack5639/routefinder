import Link from "next/link";

import { SignInForm } from "@/app/signin/signin-form";
import { normalisePostLoginPath } from "@/lib/auth/return-path";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const nextPath = normalisePostLoginPath(params.next);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(145deg,#fbf8ef,#dff3e8,#dceeff)] px-4 py-10">
      <section className="w-full max-w-lg rounded-[2rem] border border-white bg-white/85 p-6 shadow-soft backdrop-blur sm:p-9">
        <Link href="/" className="text-xs font-black uppercase tracking-[0.14em] text-leaf">
          Routefinder
        </Link>
        <h1 className="mt-5 text-4xl font-black tracking-tight">Sign in without another password.</h1>
        <p className="mt-3 font-semibold leading-7 text-ink/65">
          We will email you a secure link. Your application-readiness workspace is private and recoverable across devices.
        </p>
        {params.error === "expired-link" && (
          <p role="alert" className="mt-4 rounded-xl bg-coral/10 px-4 py-3 text-sm font-bold leading-6">
            That sign-in link is expired, invalid, or already used. Request a new link below.
          </p>
        )}
        <SignInForm nextPath={nextPath} />
        <p className="mt-5 text-xs font-semibold leading-5 text-ink/50">
          By continuing, you agree to the <Link href="/terms" className="underline">terms</Link> and confirm you have read the{" "}
          <Link href="/privacy" className="underline">privacy notice</Link>.
        </p>
      </section>
    </main>
  );
}
