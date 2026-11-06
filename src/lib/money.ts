// Toda la plata se persiste en unidades menores enteras para evitar errores de
// punto flotante. COP no usa centavos, por eso decimals = 0.
export const CURRENCY = {
  code: "COP",
  locale: "es-CO",
  decimals: 0,
} as const;

const FACTOR = 10 ** CURRENCY.decimals;

const moneyFormatter = new Intl.NumberFormat(CURRENCY.locale, {
  style: "currency",
  currency: CURRENCY.code,
  minimumFractionDigits: CURRENCY.decimals,
  maximumFractionDigits: CURRENCY.decimals,
});

/** Convierte unidades menores (lo que guarda la DB) a un número legible. */
export function toMajor(minor: number): number {
  return minor / FACTOR;
}

/** Convierte un monto escrito por el usuario a unidades menores. */
export function parseAmountToMinor(raw: string): number | null {
  const cleaned = raw
    .replace(/[^\d.,-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;

  return Math.round(value * FACTOR);
}

export function formatMoney(minor: number): string {
  return moneyFormatter.format(toMajor(minor));
}

/** Versión compacta para KPIs: $1,8 M */
export function formatMoneyCompact(minor: number): string {
  const value = toMajor(minor);
  const abs = Math.abs(value);

  if (abs >= 1_000_000) {
    return `$${(value / 1_000_000).toLocaleString(CURRENCY.locale, {
      maximumFractionDigits: 1,
    })} M`;
  }
  if (abs >= 1_000) {
    return `$${(value / 1_000).toLocaleString(CURRENCY.locale, {
      maximumFractionDigits: 0,
    })} k`;
  }
  return formatMoney(minor);
}

export function formatPercent(ratio: number): string {
  return new Intl.NumberFormat(CURRENCY.locale, {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(ratio);
}
