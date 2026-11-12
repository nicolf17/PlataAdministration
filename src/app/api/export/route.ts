import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getTransactions } from "@/lib/queries";
import { consume } from "@/lib/rate-limit";

function formatMinor(minor: number): string {
  return (minor / 100).toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/** Excel/LibreOffice ejecutan celdas que empiezan con = + - @. Se neutralizan. */
function neutralize(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** Comillas dobles se duplican y el campo se envuelve si tiene separadores. */
function csvField(value: string): string {
  const safe = neutralize(value);
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Exportar es barato pero no gratis: 20 descargas por hora alcanza de sobra.
    const limit = consume(`export:${user.id}`, 20, 60 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Demasiadas exportaciones seguidas. Probá más tarde." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } },
      );
    }

    const { searchParams } = new URL(request.url);
    const rawMonth = searchParams.get("mes") ?? "";
    // Solo "YYYY-MM": evita fechas inválidas y que el valor termine en headers.
    const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth) ? rawMonth : currentMonth();

    const transactions = await getTransactions({ month });

    const lines = ["Fecha,Tipo,Descripción,Cuenta,Tarjeta,Categoría,Monto"];
    for (const tx of transactions) {
      const date = new Date(tx.date).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const tipo = tx.type === "INCOME" ? "Ingreso" : tx.type === "EXPENSE" ? "Gasto" : "Transferencia";

      lines.push(
        [
          csvField(date),
          csvField(tipo),
          csvField(tx.description),
          csvField(tx.accountName ?? ""),
          csvField(tx.cardName ?? ""),
          csvField(tx.categoryName ?? ""),
          csvField(formatMinor(tx.amountMinor)),
        ].join(","),
      );
    }

    // BOM para que Excel abra el archivo en UTF-8 y no rompa los acentos.
    const csvString = `\uFEFF${lines.join("\r\n")}`;
    const fileName = `plata-movimientos-${month}.csv`;

    return new NextResponse(csvString, {
      headers: {
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("Error exporting CSV:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
