const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** "2026-11" */
export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function currentMonthKey(): string {
  return monthKey(new Date());
}

export function isValidMonthKey(value: string | undefined | null): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function shiftMonth(key: string, delta: number): string {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return monthKey(date);
}

/** Rango [inicio, fin) del mes, en UTC. */
export function monthRange(key: string): { start: Date; end: Date } {
  const [year, month] = key.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

export function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${MONTHS[month - 1]} ${year}`;
}

export function monthLabelShort(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${MONTHS[month - 1].slice(0, 3)} ${year}`;
}

/** Últimos n meses incluyendo `key` (del más viejo al más nuevo). */
export function previousMonths(key: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => shiftMonth(key, i - (n - 1)));
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatDayMonth(date: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

/** Para inputs type="date" (YYYY-MM-DD). */
export function toInputDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseInputDate(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`);
}

export function weekdayLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    timeZone: "UTC",
  }).format(date);
}
