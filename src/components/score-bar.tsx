export function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs font-bold uppercase text-ink/55">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full bg-leaf" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
