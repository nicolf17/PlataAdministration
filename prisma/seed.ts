/**
 * Datos de demostración: 4 meses de historia (incluido el mes actual).
 *
 * Modelo mínimo y personalizable (el usuario crea/elimina desde la app):
 * - 2 cuentas: Efectivo y Cuenta de ahorros.
 * - 1 tarjeta de crédito.
 * - 4 categorías: Alimentación, Transporte, Hogar y Salario.
 *
 * El motor de recomendaciones queda con algo que decir:
 * - Alimentación y Hogar exceden su presupuesto.
 * - Transporte va al límite (≥80%).
 * - La tarjeta pasa el 50% del cupo.
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
  const savings = await prisma.account.create({
    data: {
      name: "Cuenta de ahorros",
      type: "SAVINGS",
      initialBalanceMinor: 4_000_000,
    },
  });

  console.log("Creando tarjeta...");

  const card = await prisma.creditCard.create({
    data: {
      name: "Tarjeta de crédito",
      limitMinor: 5_000_000,
      closingDay: 25,
      dueDay: 10,
    },
  });

  console.log("Creando categorías...");

  const food = await prisma.category.create({
    data: { name: "Alimentación", type: "EXPENSE", color: "#34d399" },
  });
  const transport = await prisma.category.create({
    data: { name: "Transporte", type: "EXPENSE", color: "#60a5fa" },
  });
  const home = await prisma.category.create({
    data: { name: "Hogar", type: "EXPENSE", color: "#f59e0b" },
  });
  const salary = await prisma.category.create({
    data: { name: "Salario", type: "INCOME", color: "#34d399" },
  });

  console.log("Creando presupuestos del mes actual...");

  const currentMonth = monthIn(0);
  const budgets: Array<[string, number]> = [
    [food.id, 1_200_000],
    [transport.id, 450_000],
    [home.id, 2_300_000],
  ];

  for (const [categoryId, limitMinor] of budgets) {
    await prisma.budget.create({
      data: { categoryId, month: currentMonth, limitMinor },
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

    // Ingreso principal.
    txs.push({
      date: dateIn(offset, 1),
      type: "INCOME",
      amountMinor: 5_900_000,
      description: "Salario",
      accountId: savings.id,
      categoryId: salary.id,
    });

    // Hogar: arriendo, servicios y una compra grande este mes.
    txs.push({
      date: dateIn(offset, 3),
      type: "EXPENSE",
      amountMinor: 1_800_000,
      description: "Arriendo",
      accountId: savings.id,
      categoryId: home.id,
    });
    txs.push({
      date: dateIn(offset, 8),
      type: "EXPENSE",
      amountMinor: 320_000,
      description: "Servicios (luz, agua, internet)",
      accountId: savings.id,
      categoryId: home.id,
    });
    if (isCurrent) {
      txs.push({
        date: dateIn(offset, 4),
        type: "EXPENSE",
        amountMinor: 1_200_000,
        description: "Compras de hogar",
        creditCardId: card.id,
        categoryId: home.id,
      });
    }

    // Alimentación: mercado, restaurantes y delivery.
    txs.push(
      {
        date: dateIn(offset, 5),
        type: "EXPENSE",
        amountMinor: 240_000,
        description: "Mercado semanal",
        accountId: savings.id,
        categoryId: food.id,
      },
      {
        date: dateIn(offset, 12),
        type: "EXPENSE",
        amountMinor: 265_000,
        description: "Mercado quincena",
        creditCardId: card.id,
        categoryId: food.id,
      },
      {
        date: dateIn(offset, 26),
        type: "EXPENSE",
        amountMinor: 198_000,
        description: "Mercado de fin de mes",
        creditCardId: card.id,
        categoryId: food.id,
      },
      {
        date: dateIn(offset, 9),
        type: "EXPENSE",
        amountMinor: 78_000,
        description: "Almuerzo con equipo",
        creditCardId: card.id,
        categoryId: food.id,
      },
      {
        date: dateIn(offset, 17),
        type: "EXPENSE",
        amountMinor: 132_000,
        description: "Cena de viernes",
        creditCardId: card.id,
        categoryId: food.id,
      },
      {
        date: dateIn(offset, 24),
        type: "EXPENSE",
        amountMinor: 96_000,
        description: "Restaurante familiar",
        creditCardId: card.id,
        categoryId: food.id,
      },
    );

    // Delivery: este mes se dispara.
    const deliveryDays = isCurrent ? [2, 8, 14, 19, 25] : [7, 21];
    for (const day of deliveryDays) {
      txs.push({
        date: dateIn(offset, day),
        type: "EXPENSE",
        amountMinor: isCurrent ? 49_000 : 46_000,
        description: "Pedido por app",
        creditCardId: card.id,
        categoryId: food.id,
      });
    }

    // Transporte: gasolina con tarjeta y viajes en efectivo.
    txs.push({
      date: dateIn(offset, 6),
      type: "EXPENSE",
      amountMinor: 350_000,
      description: "Gasolina",
      creditCardId: card.id,
      categoryId: transport.id,
    });
    for (const day of [4, 11, 22]) {
      txs.push({
        date: dateIn(offset, day),
        type: "EXPENSE",
        amountMinor: 19_000,
        description: "Viaje en app",
        accountId: cash.id,
        categoryId: transport.id,
      });
    }

    // Retiro para efectivo y pago de tarjeta.
    txs.push({
      date: dateIn(offset, 5),
      type: "TRANSFER",
      amountMinor: 300_000,
      description: "Retiro para efectivo",
      accountId: savings.id,
      transferAccountId: cash.id,
    });

    if (!isCurrent) {
      txs.push({
        date: dateIn(offset, 10),
        type: "TRANSFER",
        amountMinor: 1_300_000,
        description: "Pago tarjeta",
        accountId: savings.id,
        creditCardId: card.id,
      });
    }
  }

  await prisma.transaction.createMany({
    data: txs.map((tx) => ({ ...tx, notes: null })),
  });

  console.log(`Listo: ${txs.length} movimientos, 2 cuentas, 1 tarjeta, 4 categorías.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
