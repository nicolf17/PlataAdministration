import Link from "next/link";

import {
  IconAlert,
  IconArrowUp,
  IconCheck,
  IconInfo,
  IconSparkles,
} from "@/components/icons";
import type {
  Recommendation,
  RecommendationSeverity,
} from "@/lib/recommendations";

const STYLES: Record<
  RecommendationSeverity,
  { border: string; bg: string; text: string; Icon: typeof IconInfo }
> = {
  danger: {
    border: "border-danger/30",
    bg: "bg-danger/5",
    text: "text-danger",
    Icon: IconAlert,
  },
  warning: {
    border: "border-warning/30",
    bg: "bg-warning/5",
    text: "text-warning",
    Icon: IconAlert,
  },
  info: {
    border: "border-info/25",
    bg: "bg-info/5",
    text: "text-info",
    Icon: IconInfo,
  },
  success: {
    border: "border-accent/25",
    bg: "bg-accent/5",
    text: "text-accent",
    Icon: IconCheck,
  },
};

export function RecommendationCard({ item }: { item: Recommendation }) {
  const style = STYLES[item.severity];
  const Icon = style.Icon;

  return (
    <article
      className={`rounded-xl border ${style.border} ${style.bg} p-3.5`}
    >
      <div className="flex gap-3">
        <span className={`mt-0.5 shrink-0 ${style.text}`}>
          <Icon className="size-4.5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold leading-snug">{item.title}</h3>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">
            {item.detail}
          </p>
          {item.action && item.href ? (
            <Link
              href={item.href}
              className={`mt-2 inline-flex items-center gap-1 text-[11px] font-semibold ${style.text} hover:underline`}
            >
              {item.action} <IconArrowUp className="size-3 rotate-45" />
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function RecommendationsPanel({
  items,
}: {
  items: Recommendation[];
}) {
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center gap-2">
        <IconSparkles className="size-4 text-accent" />
        <h2 className="text-sm font-semibold">Recomendaciones</h2>
        <span className="ml-auto text-[11px] text-muted">
          Reglas sobre tus últimos 4 meses
        </span>
      </div>
      <div className="grid gap-2">
        {items.map((item) => (
          <RecommendationCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
