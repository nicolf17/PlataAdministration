import type { ReactNode } from "react";

type Tone = "neutral" | "positive" | "negative" | "accent";

const TONE_VALUE: Record<Tone, string> = {
  neutral: "text-foreground",
  positive: "text-accent",
  negative: "text-danger",
  accent: "text-info",
};

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  icon?: ReactNode;
}) {
  return (
    <div className="card animate-rise p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
          {label}
        </span>
        {icon ? <span className="text-muted">{icon}</span> : null}
      </div>
      <p
        className={`mt-2 text-xl font-semibold tabular-nums tracking-tight md:text-2xl ${TONE_VALUE[tone]}`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
}
