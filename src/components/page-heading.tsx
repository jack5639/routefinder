import type { ReactNode } from "react";

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-leaf">{eyebrow}</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] sm:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl font-semibold leading-7 text-ink/65">{description}</p>
      </div>
      {action}
    </header>
  );
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-dashed border-ink/20 bg-white/60 p-8 text-center sm:p-12">
      <h2 className="text-2xl font-black">{title}</h2>
      <div className="mx-auto mt-3 max-w-xl font-semibold leading-7 text-ink/60">{children}</div>
    </section>
  );
}
