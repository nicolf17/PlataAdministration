"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseAmountToMinor } from "@/lib/money";

export type OnboardingResult = { ok: boolean; message: string };

// El paso 1 pregunta un monto y una frecuencia. Guardamos el equivalente
// mensual para que la tasa de ahorro del panel tenga sentido.
const FACTOR_MENSUAL: Record<string, number> = {
  mensual: 1,
  quincenal: 2,
  semanal: 4,
  diario: 30,
};

const DESCRIPCION_INGRESO = "Ingreso inicial";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function mesActual(): string {
  const ahora = new Date();
  return `${ahora.getUTCFullYear()}-${String(ahora.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Cierra el onboarding: crea el efectivo, registra el ingreso, las categorías,
 * el método de pago y los presupuestos del mes, y marca al usuario como listo.
 *
 * Todo va en una transacción: si algo falla, no queda media configuración.
 * Es idempotente, así que apretar "Finalizar" dos veces no duplica nada.
 */
export async function completarOnboarding(formData: FormData): Promise<OnboardingResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, message: "Tu sesión venció. Volvé a iniciar sesión." };
  }

  try {
    const mes = mesActual();

    const frecuencia = str(formData, "frecuencia").toLowerCase() || "mensual";
    const factor = FACTOR_MENSUAL[frecuencia] ?? 1;
    const ingresoMinor = parseAmountToMinor(str(formData, "ingresoMensual"));

    const categorias = str(formData, "categorias")
      .split(",")
      .map((nombre) => nombre.trim())
      .filter((nombre) => nombre.length > 0);

    const metodoPago = str(formData, "metodoPago");
    const nombreMetodo = str(formData, "nombreMetodo");

    // Los límites llegan como "limite_<nombre de categoría>".
    const limites = new Map<string, number>();
    for (const [clave, valor] of formData.entries()) {
      if (!clave.startsWith("limite_")) continue;
      const nombre = clave.slice("limite_".length).trim();
      const monto = parseAmountToMinor(String(valor));
      if (nombre && monto) limites.set(nombre, monto);
    }

    await prisma.$transaction(async (tx) => {
      // 1. Efectivo: es la cuenta nativa y el lugar natural del ingreso inicial.
      let efectivo = await tx.account.findFirst({
        where: { userId: user.id, type: "CASH" },
      });
      if (!efectivo) {
        efectivo = await tx.account.create({
          data: {
            name: "Efectivo",
            type: "CASH",
            initialBalanceMinor: 0,
            userId: user.id,
          },
        });
      }

      // 2. Ingreso inicial, ya normalizado a mensual.
      if (ingresoMinor && ingresoMinor > 0) {
        const yaExiste = await tx.transaction.findFirst({
          where: { userId: user.id, description: DESCRIPCION_INGRESO },
          select: { id: true },
        });
        if (!yaExiste) {
          await tx.transaction.create({
            data: {
              userId: user.id,
              date: new Date(),
              type: "INCOME",
              amountMinor: ingresoMinor * factor,
              description: DESCRIPCION_INGRESO,
              accountId: efectivo.id,
            },
          });
        }
      }

      // 3. Categorías elegidas (la personalizada ya viene dentro de la lista).
      for (const nombre of categorias) {
        const existente = await tx.category.findFirst({
          where: { userId: user.id, name: nombre, type: "EXPENSE", parentId: null },
          select: { id: true },
        });
        if (!existente) {
          await tx.category.create({
            data: { name: nombre, type: "EXPENSE", color: "#64748b", userId: user.id },
          });
        }
      }

      // 4. Método de pago principal.
      if (metodoPago === "ahorro") {
        const existente = await tx.account.findFirst({
          where: { userId: user.id, type: "SAVINGS" },
          select: { id: true },
        });
        if (!existente) {
          await tx.account.create({
            data: {
              name: nombreMetodo || "Cuenta de ahorros",
              type: "SAVINGS",
              initialBalanceMinor: 0,
              userId: user.id,
            },
          });
        }
      } else if (metodoPago === "tarjeta") {
        const existente = await tx.creditCard.findFirst({
          where: { userId: user.id },
          select: { id: true },
        });
        if (!existente) {
          await tx.creditCard.create({
            data: {
              name: nombreMetodo || "Tarjeta de crédito",
              limitMinor: 5_000_000,
              closingDay: 25,
              dueDay: 10,
              userId: user.id,
            },
          });
        }
      }

      // 5. Presupuestos del mes para las categorías con límite.
      for (const [nombre, limiteMinor] of limites) {
        const categoria = await tx.category.findFirst({
          where: { userId: user.id, name: nombre, type: "EXPENSE" },
          select: { id: true },
        });
        if (!categoria) continue;

        await tx.budget.upsert({
          where: {
            userId_categoryId_month: {
              userId: user.id,
              categoryId: categoria.id,
              month: mes,
            },
          },
          create: {
            userId: user.id,
            categoryId: categoria.id,
            month: mes,
            limitMinor: limiteMinor,
          },
          update: { limitMinor: limiteMinor },
        });
      }

      // 6. Listo: ya puede entrar al panel.
      await tx.user.update({
        where: { id: user.id },
        data: { onboardingCompleted: true },
      });
    });

    revalidatePath("/", "layout");
    return { ok: true, message: "Configuración guardada." };
  } catch (error) {
    console.error("[plata] completarOnboarding falló:", error);
    return {
      ok: false,
      message: "No pudimos guardar tu configuración. Probá de nuevo en unos minutos.",
    };
  }
}
