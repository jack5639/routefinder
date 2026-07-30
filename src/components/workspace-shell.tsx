import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { href: "/app", label: "This week" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/evidence", label: "Evidence" },
  { href: "/tracker", label: "Tracker" },
];

export function WorkspaceShell({ children, email }: { children: ReactNode; email?: string }) {
  return (
    <main className="min-h-screen bg-[linear-gradient(145deg,#fbf8ef,#eff8f2_45%,#e8f3ff)] text-ink">
      <header className="sticky top-0 z-20 border-b border-ink/10 bg-oat/92 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 sm:px-6 md:grid-cols-[auto_1fr_auto] lg:px-8">
          <Link href="/app" className="shrink-0 text-sm font-black uppercase tracking-[0.12em] text-leaf">
            Routefinder
          </Link>
          <nav aria-label="Workspace navigation" className="order-3 col-span-2 min-w-0 overflow-x-auto md:order-none md:col-span-1">
            <div className="mx-auto flex w-max gap-1 rounded-full border border-ink/10 bg-white/80 p-1 text-xs font-black">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="shrink-0 rounded-full px-3 py-2 text-ink/65 hover:bg-mint hover:text-ink">
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
          <Link href="/account" className="shrink-0 rounded-full border border-ink/10 bg-white px-3 py-2 text-xs font-black text-ink/65">
            {email ? "Account" : "Sign in"}
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">{children}</div>
    </main>
  );
}
