import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/quiz", label: "Quiz" },
  { href: "/results", label: "Results" },
  { href: "/simulator", label: "What-if" },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-4 sm:px-6 lg:px-8">
      <header className="sticky top-0 z-10 -mx-4 border-b border-ink/10 bg-oat/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <nav className="flex items-center justify-between gap-3">
          <Link href="/" className="text-sm font-black tracking-wide text-ink">
            Future Route Planner
          </Link>
          <div className="flex gap-1 rounded-full border border-ink/10 bg-white/70 p-1 text-xs font-semibold shadow-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-2 text-ink/70 transition hover:bg-mint hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <div className="flex-1 py-6 sm:py-10">{children}</div>
    </main>
  );
}
