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
    <div className="card animate-rise p-3.5 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted sm:text-[11px]">
          {label}
        </span>
        {icon ? <span className="shrink-0 text-muted">{icon}</span> : null}
      </div>
      <p
        className={`mt-1.5 text-[17px] font-semibold leading-tight tabular-nums tracking-tight sm:text-xl md:text-2xl ${TONE_VALUE[tone]}`}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[10px] leading-tight text-muted sm:text-[11px]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
