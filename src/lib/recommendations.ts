// Motor de recomendaciones v1: reglas determinísticas y explicables.
// No es "magia": cada recomendación nace de un número que el usuario puede auditar.
// Al ser una función pura, se puede testear sin base de datos.

export type RecommendationSeverity = "success" | "info" | "warning" | "danger";

export type Recommendation = {
  id: string;
  severity: RecommendationSeverity;
  title: string;
  detail: string;
  action?: string;
  href?: string;
};

export type CategorySpending = {
  id: string;
  name: string;
  currentMinor: number;
  baselineMinor: number;
};

export type CardUsage = {
  id: string;
  name: string;
  limitMinor: number;
  debtMinor: number;
};

export type BudgetUsage = {
  id: string;
  categoryName: string;
  limitMinor: number;
  spentMinor: number;
};

export type RecommendationInput = {
  month: string;
  incomeMinor: number;
  expenseMinor: number;
  spendingByCategory: CategorySpending[];
  cards: CardUsage[];
  budgets: BudgetUsage[];
};

const SEVERITY_ORDER: Record<RecommendationSeverity, number> = {
  danger: 0,
  warning: 1,
  info: 2,
  success: 3,
};

// Por debajo de esto, una variación no justifica una alerta (ruido).
const SPIKE_FLOOR_MINOR = 50_000;

export function buildRecommendations(
  input: RecommendationInput,
): Recommendation[] {
  const out: Recommendation[] = [];
  const { incomeMinor, expenseMinor, month } = input;

  // 1. Tasa de ahorro
  const savedMinor = incomeMinor - expenseMinor;
  const savingsRate = incomeMinor > 0 ? savedMinor / incomeMinor : 0;

  if (incomeMinor === 0) {
    out.push({
      id: "no-income",
      severity: "info",
      title: "Sin ingresos registrados este mes",
      detail:
        "Registrá tu salario o entradas para que los indicadores y las recomendaciones tengan sentido.",
      action: "Registrar ingreso",
      href: `/movimientos?mes=${month}&tipo=INCOME#nuevo`,
    });
  } else if (savedMinor < 0) {
    out.push({
      id: "negative-savings",
      severity: "danger",
      title: "Estás gastando más de lo que ingresás",
      detail: `Este mes gastaste ${formatShort(
        Math.abs(savedMinor),
      )} más de lo que entró. Revisá los gastos variables antes de que se convierta en deuda.`,
      action: "Ver movimientos",
      href: `/movimientos?mes=${month}`,
    });
  } else if (savingsRate < 0.1) {
    out.push({
      id: "low-savings",
      severity: "warning",
      title: "Tu colchón de ahorro está justo",
      detail: `Ahorraste ${Math.round(
        savingsRate * 100,
      )}% de tus ingresos. La referencia sana es 20%.`,
      action: "Ajustar presupuestos",
      href: `/presupuestos?mes=${month}`,
    });
  } else if (savingsRate >= 0.2) {
    out.push({
      id: "healthy-savings",
      severity: "success",
      title: "Buen ritmo de ahorro",
      detail: `Guardaste ${Math.round(
        savingsRate * 100,
      )}% de tus ingresos este mes. Mantené el ritmo y automatizá la transferencia a ahorros.`,
    });
  }

  // 2. Categorías que se dispararon contra su propio promedio (3 meses previos)
  const spikes = input.spendingByCategory
    .filter(
      (c) =>
        c.baselineMinor >= SPIKE_FLOOR_MINOR &&
        c.currentMinor > c.baselineMinor * 1.3 &&
        c.currentMinor - c.baselineMinor >= SPIKE_FLOOR_MINOR,
    )
    .sort((a, b) => b.currentMinor - b.baselineMinor - (a.currentMinor - a.baselineMinor))
    .slice(0, 2);

  for (const spike of spikes) {
    const pct = Math.round(
      ((spike.currentMinor - spike.baselineMinor) / spike.baselineMinor) * 100,
    );
    out.push({
      id: `spike-${spike.id}`,
      severity: pct >= 60 ? "warning" : "info",
      title: `${spike.name} subió ${pct}%`,
      detail: `Este mes: ${formatShort(
        spike.currentMinor,
      )}. Promedio de los últimos 3 meses: ${formatShort(
        spike.baselineMinor,
      )}. Diferencia: ${formatShort(spike.currentMinor - spike.baselineMinor)}.`,
      action: "Ver categoría",
      href: `/movimientos?mes=${month}&categoria=${spike.id}`,
    });
  }

  // 3. Uso de tarjetas de crédito
  for (const card of input.cards) {
    if (card.limitMinor <= 0) continue;
    const usage = card.debtMinor / card.limitMinor;
    if (usage < 0.5) continue;

    out.push({
      id: `card-${card.id}`,
      severity: usage >= 0.8 ? "danger" : "warning",
      title:
        usage >= 0.8
          ? `${card.name} está al ${Math.round(usage * 100)}% de su cupo`
          : `${card.name} ya usa ${Math.round(usage * 100)}% del cupo`,
      detail: `Deuda actual ${formatShort(
        card.debtMinor,
      )} sobre un cupo de ${formatShort(
        card.limitMinor,
      )}. Usar más del 50% del cupo afecta tu historial crediticio.`,
      action: "Pagar tarjeta",
      href: `/cuentas#tarjeta-${card.id}`,
    });
  }

  // 4. Presupuestos
  const overBudget = input.budgets
    .filter((b) => b.limitMinor > 0 && b.spentMinor > b.limitMinor)
    .sort((a, b) => b.spentMinor - b.limitMinor - (a.spentMinor - a.limitMinor))
    .slice(0, 2);

  for (const budget of overBudget) {
    out.push({
      id: `budget-over-${budget.id}`,
      severity: "danger",
      title: `Te pasaste del presupuesto en ${budget.categoryName}`,
      detail: `Gastaste ${formatShort(
        budget.spentMinor,
      )} de un límite de ${formatShort(
        budget.limitMinor,
      )} (${Math.round((budget.spentMinor / budget.limitMinor) * 100)}%).`,
      action: "Revisar presupuesto",
      href: `/presupuestos?mes=${month}`,
    });
  }

  const nearBudget = input.budgets
    .filter(
      (b) =>
        b.limitMinor > 0 &&
        b.spentMinor <= b.limitMinor &&
        b.spentMinor / b.limitMinor >= 0.8,
    )
    .slice(0, 1);

  for (const budget of nearBudget) {
    out.push({
      id: `budget-near-${budget.id}`,
      severity: "warning",
      title: `Vas al límite en ${budget.categoryName}`,
      detail: `Usaste el ${Math.round(
        (budget.spentMinor / budget.limitMinor) * 100,
      )}% del presupuesto. Te quedan ${formatShort(
        budget.limitMinor - budget.spentMinor,
      )}.`,
    });
  }

  // 5. Concentración: una sola categoría se come el mes
  if (expenseMinor > 0) {
    const top = [...input.spendingByCategory].sort(
      (a, b) => b.currentMinor - a.currentMinor,
    )[0];
    const share = top ? top.currentMinor / expenseMinor : 0;

    if (top && share >= 0.35) {
      out.push({
        id: `concentration-${top.id}`,
        severity: "info",
        title: `${top.name} concentra ${Math.round(share * 100)}% de tus gastos`,
        detail:
          "Cuando una categoría pesa tanto, un presupuesto mensual te da más control que revisar movimiento por movimiento.",
        action: "Definir presupuesto",
        href: `/presupuestos?mes=${month}`,
      });
    }
  }

  if (out.length === 0) {
    out.push({
      id: "all-clear",
      severity: "success",
      title: "Todo en orden por ahora",
      detail:
        "No detectamos desvíos ni presupuestos excedidos este mes. Seguí registrando movimientos para afinar las recomendaciones.",
    });
  }

  return out
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .slice(0, 6);
}

// Formato local para no acoplar el motor a Intl/currency del entorno.
function formatShort(minor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(minor);
}
