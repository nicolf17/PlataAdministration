import Link from "next/link";

import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import { currentMonthKey, monthLabel, shiftMonth } from "@/lib/dates";

export function MonthPicker({
  month,
  basePath,
}: {
  month: string;
  basePath: string;
}) {
  const previous = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const isCurrent = month === currentMonthKey();
  // Los meses son "YYYY-MM": comparar como texto ordena igual que el calendario.
  const isFuture = month > currentMonthKey();

  const today = !isCurrent ? (
    <Link
      href={basePath}
      className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium text-accent hover:bg-accent-soft"
    >
      Hoy
    </Link>
  ) : null;

  return (
    <div className="flex w-full items-center gap-1 rounded-xl border border-line bg-surface/70 p-1 sm:w-auto">
      {/* "Hoy" queda del lado hacia donde está el presente: a la izquierda si
          estamos en un mes futuro (hay que volver atrás), a la derecha si
          estamos en uno pasado (hay que avanzar). */}
      {isFuture ? today : null}

      <Link
        href={`${basePath}?mes=${previous}`}
        aria-label="Mes anterior"
        className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        <IconChevronLeft className="size-4" />
      </Link>

      <span className="min-w-0 flex-1 text-center text-sm font-medium capitalize sm:min-w-36 sm:flex-none">
        {monthLabel(month)}
      </span>

      <Link
        href={`${basePath}?mes=${next}`}
        aria-label="Mes siguiente"
        className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        <IconChevronRight className="size-4" />
      </Link>

      {!isFuture ? today : null}
    </div>
  );
}
