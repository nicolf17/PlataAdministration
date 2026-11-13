"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function completarOnboarding(
  formData: FormData
): Promise<{ ok: boolean; message: string }> {
  const paso = Number(formData.get("paso")) || 1;

  // Obtener usuario actual
  const { getSessionUser } = await import("@/lib/auth");
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, message: "Usuario no autenticado." };
  }

  // Marcar onboarding como completado en la base de datos
  await prisma.$executeRaw`
    UPDATE "User" SET "onboardingCompleted" = true WHERE id = ${user.id}
  `;

  // Registrar ingresos iniciales si el paso 1 fue completado
  if (paso >= 1) {
    const montoStr = formData.get("monto") as string || "0";
    const descripcion = formData.get("descripcion") as string || "Ingreso inicial";

    try {
      const monto = parseInt(montoStr.replace(/[^0-9]/g, ""), 10) || 0;
      await prisma.$executeRaw`
        INSERT INTO "Transaction" (id, userId, date, type, amountMinor, description, createdAt)
        VALUES (gen_random_uuid(), ${user.id}, now(), 'INCOME', ${monto * 100}, ${descripcion}, now())
      `;
    } catch (e) {
      console.error("Error guardando ingreso:", e);
    }
  }

  // Marcar que el onboarding terminó
  revalidatePath("/");
  revalidatePath("/onboarding");
  redirect("/");
}