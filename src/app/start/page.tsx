import Link from "next/link";

import { StartExperience } from "@/app/start/start-experience";
import { normaliseCampaignCode } from "@/lib/campaign";

export const metadata = { title: "Get a free first result" };

export default async function StartPage({ searchParams }: { searchParams: Promise<{ campaign?: string }> }) {
  const campaign = normaliseCampaignCode((await searchParams).campaign);
  return (
    <main className="min-h-screen bg-[linear-gradient(145deg,#fbf8ef,#eef8f1_46%,#dceeff)] px-4 py-8 text-ink sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex min-h-11 items-center text-xs font-black uppercase tracking-[0.14em] text-leaf">← Routefinder</Link>
        <header className="mt-6 max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-leaf">Free · no account needed</p>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-6xl">Get one useful application result now.</h1>
          <p className="mt-5 text-lg font-semibold leading-8 text-ink/65">Choose the starting point that matches what you know. Your result will keep requirements, evidence, uncertainty, and next actions separate.</p>
        </header>
        <StartExperience campaign={campaign} />
      </div>
    </main>
  );
}
