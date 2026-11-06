/**
 * Datos de demostración: 4 meses de historia (incluido el mes actual).
 *
 * Está armado para que el motor de recomendaciones tenga algo que decir:
 * - Alimentación excede su presupuesto.
 * - Delivery sube fuerte contra su promedio de 3 meses.
 * - La Mastercard Nu queda con más del 50% del cupo usado.
 * - El ahorro se mantiene sano (≈20%).
 *
 * Correr con: npm run db:seed
 */

import "dotenv/config";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL");

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url }),
});

const OFFSETS = [-3, -2, -1, 0] as const;

function dateIn(monthOffset: number, day: number): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, day, 12),
  );
}

function monthIn(monthOffset: number): string {
  const now = new Date();
  const date = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1),
  );
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

const CATEGORY_TREE = [
  { slug: "vivienda", name: "Vivienda", color: "#f59e0b", children: ["Arriendo", "Servicios"] },
  { slug: "alimentacion", name: "Alimentación", color: "#34d399", children: ["Mercado", "Restaurantes", "Delivery"] },
  { slug: "transporte", name: "Transporte", color: "#60a5fa", children: ["Gasolina", "Apps de transporte"] },
  { slug: "salud", name: "Salud", color: "#f87171", children: [] },
  { slug: "ocio", name: "Ocio", color: "#a78bfa", children: ["Streaming", "Salidas"] },
  { slug: "educacion", name: "Educación", color: "#22d3ee", children: [] },
  { slug: "compras", name: "Compras", color: "#fb7185", children: [] },
  { slug: "otros", name: "Otros", color: "#94a3b8", children: [] },
] as const;

const INCOME_CATEGORIES = [
  { slug: "salario", name: "Salario", color: "#34d399" },
  { slug: "freelance", name: "Freelance", color: "#22d3ee" },
  { slug: "rendimientos", name: "Rendimientos", color: "#a3e635" },
] as const;

async function main() {
  console.log("Limpiando datos anteriores...");

  await prisma.budget.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.category.deleteMany();
  await prisma.creditCard.deleteMany();
  await prisma.account.deleteMany();

  console.log("Creando cuentas...");

  const cash = await prisma.account.create({
    data: { name: "Efectivo", type: "CASH", initialBalanceMinor: 200_000 },
  });
  const bank = await prisma.account.create({
    data: { name: "Cuenta Bancolombia", type: "BANK", initialBalanceMinor: 3_200_000 },
  });
  const savings = await prisma.account.create({
    data: { name: "Ahorros Nu", type: "SAVINGS", initialBalanceMinor: 6_500_000 },
  });
  const nequi = await prisma.account.create({
    data: { name: "Nequi", type: "WALLET", initialBalanceMinor: 450_000 },
  });

  console.log("Creando tarjetas...");

  const visa = await prisma.creditCard.create({
    data: {
      name: "Visa Bancolombia",
      limitMinor: 6_000_000,
      closingDay: 25,
      dueDay: 10,
    },
  });
  const nu = await prisma.creditCard.create({
    data: {
      name: "Mastercard Nu",
      limitMinor: 1_500_000,
      closingDay: 15,
      dueDay: 5,
    },
  });

  console.log("Creando categorías...");

  const cat: Record<string, string> = {};

  for (const parent of CATEGORY_TREE) {
    const created = await prisma.category.create({
      data: { name: parent.name, type: "EXPENSE", color: parent.color },
    });
    cat[parent.slug] = created.id;

    for (const child of parent.children) {
      const childCreated = await prisma.category.create({
        data: {
          name: child,
          type: "EXPENSE",
          color: parent.color,
          parentId: created.id,
        },
      });
      cat[child] = childCreated.id;
    }
  }

  for (const income of INCOME_CATEGORIES) {
    const created = await prisma.category.create({
      data: { name: income.name, type: "INCOME", color: income.color },
    });
    cat[income.slug] = created.id;
  }

  console.log("Creando presupuestos del mes actual...");

  const currentMonth = monthIn(0);
  const budgets: Array<[string, number]> = [
    ["vivienda", 2_300_000],
    ["alimentacion", 1_200_000],
    ["transporte", 450_000],
    ["ocio", 350_000],
    ["compras", 400_000],
  ];

  for (const [categorySlug, limitMinor] of budgets) {
    await prisma.budget.create({
      data: {
        categoryId: cat[categorySlug],
        month: currentMonth,
        limitMinor,
      },
    });
  }

  console.log("Creando movimientos...");

  type SeedTx = {
    date: Date;
    type: "INCOME" | "EXPENSE" | "TRANSFER";
    amountMinor: number;
    description: string;
    accountId?: string;
    transferAccountId?: string;
    creditCardId?: string;
    categoryId?: string;
  };

  const txs: SeedTx[] = [];

  for (const offset of OFFSETS) {
    const isCurrent = offset === 0;

    // Ingresos
    txs.push({
      date: dateIn(offset, 1),
      type: "INCOME",
      amountMinor: 5_800_000,
      description: "Salario",
      accountId: bank.id,
      categoryId: cat.salario,
    });

    if (offset <= -1) {
      txs.push({
        date: dateIn(offset, 20),
        type: "INCOME",
        amountMinor: offset === -1 ? 1_200_000 : 900_000,
        description: "Proyecto freelance",
        accountId: bank.id,
        categoryId: cat.freelance,
      });
    }

    txs.push({
      date: dateIn(offset, 28),
      type: "INCOME",
      amountMinor: 42_000,
      description: "Rendimientos cuenta de ahorros",
      accountId: savings.id,
      categoryId: cat.rendimientos,
    });

    // Vivienda
    txs.push({
      date: dateIn(offset, 3),
      type: "EXPENSE",
      amountMinor: 1_800_000,
      description: "Arriendo",
      accountId: bank.id,
      categoryId: cat.Arriendo,
    });
    txs.push({
      date: dateIn(offset, 8),
      type: "EXPENSE",
      amountMinor: 320_000,
      description: "Servicios (luz, agua, internet)",
      accountId: bank.id,
      categoryId: cat.Servicios,
    });

    // Alimentación
    txs.push(
      {
        date: dateIn(offset, 5),
        type: "EXPENSE",
        amountMinor: 240_000,
        description: "Mercado semanal",
        accountId: bank.id,
        categoryId: cat.Mercado,
      },
      {
        date: dateIn(offset, 12),
        type: "EXPENSE",
        amountMinor: 265_000,
        description: "Mercado quincena",
        creditCardId: visa.id,
        categoryId: cat.Mercado,
      },
      {
        date: dateIn(offset, 19),
        type: "EXPENSE",
        amountMinor: 210_000,
        description: "Mercado y aseo",
        accountId: bank.id,
        categoryId: cat.Mercado,
      },
      {
        date: dateIn(offset, 26),
        type: "EXPENSE",
        amountMinor: 198_000,
        description: "Mercado de fin de mes",
        creditCardId: visa.id,
        categoryId: cat.Mercado,
      },
    );

    txs.push(
      {
        date: dateIn(offset, 9),
        type: "EXPENSE",
        amountMinor: 78_000,
        description: "Almuerzo con equipo",
        creditCardId: nu.id,
        categoryId: cat.Restaurantes,
      },
      {
        date: dateIn(offset, 17),
        type: "EXPENSE",
        amountMinor: 132_000,
        description: "Cena de viernes",
        creditCardId: visa.id,
        categoryId: cat.Restaurantes,
      },
      {
        date: dateIn(offset, 24),
        type: "EXPENSE",
        amountMinor: 96_000,
        description: "Restaurante familiar",
        creditCardId: nu.id,
        categoryId: cat.Restaurantes,
      },
    );

    // Delivery: el mes actual se dispara (5 pedidos contra 2 habituales).
    const deliveryDays = isCurrent ? [2, 8, 14, 19, 25] : [7, 21];
    for (const day of deliveryDays) {
      txs.push({
        date: dateIn(offset, day),
        type: "EXPENSE",
        amountMinor: isCurrent ? 49_000 : 46_000,
        description: "Pedido por app",
        creditCardId: nu.id,
        categoryId: cat.Delivery,
      });
    }

    // Transporte
    txs.push({
      date: dateIn(offset, 6),
      type: "EXPENSE",
      amountMinor: 350_000,
      description: "Gasolina",
      creditCardId: visa.id,
      categoryId: cat.Gasolina,
    });
    for (const day of [4, 11, 22]) {
      txs.push({
        date: dateIn(offset, day),
        type: "EXPENSE",
        amountMinor: 19_000,
        description: "Viaje en app",
        accountId: nequi.id,
        categoryId: cat["Apps de transporte"],
      });
    }

    // Ocio
    txs.push({
      date: dateIn(offset, 2),
      type: "EXPENSE",
      amountMinor: 89_900,
      description: "Streaming",
      creditCardId: visa.id,
      categoryId: cat.Streaming,
    });
    txs.push({
      date: dateIn(offset, 13),
      type: "EXPENSE",
      amountMinor: offset === -1 ? 280_000 : 210_000,
      description: "Salida con amigos",
      creditCardId: visa.id,
      categoryId: cat.Salidas,
    });

    // Compras puntuales
    if (offset === -1) {
      txs.push({
        date: dateIn(offset, 16),
        type: "EXPENSE",
        amountMinor: 450_000,
        description: "Zapatillas",
        creditCardId: nu.id,
        categoryId: cat.compras,
      });
    }
    if (isCurrent) {
      txs.push({
        date: dateIn(offset, 3),
        type: "EXPENSE",
        amountMinor: 120_000,
        description: "Audífonos",
        creditCardId: nu.id,
        categoryId: cat.compras,
      });
    }

    // Educación (gasto grande aislado)
    if (offset === -2) {
      txs.push({
        date: dateIn(offset, 10),
        type: "EXPENSE",
        amountMinor: 800_000,
        description: "Curso de arquitectura",
        accountId: bank.id,
        categoryId: cat.educacion,
      });
    }

    // Transferencia a ahorros
    txs.push({
      date: dateIn(offset, 5),
      type: "TRANSFER",
      amountMinor: offset === -3 ? 300_000 : 500_000,
      description: "Ahorro automático",
      accountId: bank.id,
      transferAccountId: savings.id,
    });

    // Pagos de tarjeta
    if (offset === -2) {
      txs.push({
        date: dateIn(offset, 10),
        type: "TRANSFER",
        amountMinor: 1_200_000,
        description: "Pago Visa",
        accountId: bank.id,
        creditCardId: visa.id,
      });
    }
    if (offset === -1) {
      txs.push({
        date: dateIn(offset, 10),
        type: "TRANSFER",
        amountMinor: 1_400_000,
        description: "Pago Visa",
        accountId: bank.id,
        creditCardId: visa.id,
      });
    }
    if (isCurrent) {
      txs.push({
        date: dateIn(offset, 5),
        type: "TRANSFER",
        amountMinor: 600_000,
        description: "Pago Mastercard Nu",
        accountId: bank.id,
        creditCardId: nu.id,
      });
    }
  }

  await prisma.transaction.createMany({
    data: txs.map((tx) => ({ ...tx, notes: null })),
  });

  console.log(`Listo: ${txs.length} movimientos, 4 cuentas, 2 tarjetas.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
