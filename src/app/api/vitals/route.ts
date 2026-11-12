import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { consume } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

const ALLOWED = new Set(["LCP", "INP", "CLS", "FCP", "TTFB"]);
const RATINGS = new Set(["good", "needs-improvement", "poor"]);

// Tope de body: una métrica real pesa menos de 300 bytes.
const MAX_BODY_BYTES = 2048;

export async function POST(request: Request) {
  // Endpoint público (lo llama el navegador de cualquier visitante), así que
  // tiene que estar limitado o se convierte en una forma de llenar la base.
  const ip = await clientIp();
  const limit = consume(`vitals:${ip}`, 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } },
    );
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const data = body as {
    name?: unknown;
    value?: unknown;
    rating?: unknown;
    path?: unknown;
  };

  const name = typeof data.name === "string" ? data.name : "";
  const value = typeof data.value === "number" ? data.value : Number.NaN;
  if (!ALLOWED.has(name) || !Number.isFinite(value) || value < 0 || value > 1_000_000_000) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const rating =
    typeof data.rating === "string" && RATINGS.has(data.rating) ? data.rating : null;
  const path =
    typeof data.path === "string" && data.path.startsWith("/") ? data.path.slice(0, 120) : null;

  await prisma.webVital.create({ data: { name, value, rating, path } });
  return NextResponse.json({ ok: true });
}

/** Resumen de los últimos 7 días: p75 por métrica (lo que mide Google). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  // 5.000 filas alcanza para un p75 estable y evita traer la tabla entera.
  const rows = await prisma.webVital.findMany({
    where: { createdAt: { gte: since } },
    select: { name: true, value: true },
    orderBy: { createdAt: "desc" },
    take: 5_000,
  });

  const summary = [...ALLOWED].map((name) => {
    const values = rows
      .filter((row) => row.name === name)
      .map((row) => row.value)
      .sort((a, b) => a - b);
    if (values.length === 0) return { name, samples: 0, p75: null };
    const index = Math.min(values.length - 1, Math.ceil(values.length * 0.75) - 1);
    return { name, samples: values.length, p75: values[index] ?? null };
  });

  return NextResponse.json({ ok: true, days: 7, summary });
}
