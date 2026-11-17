import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "Falta DATABASE_URL. Copiá .env.example a .env y apuntalo a tu base Postgres.",
    );
  }

  // Postgres en cualquier proveedor (Neon, Supabase, Vercel Postgres, local):
  // el adapter mantiene un pool de conexiones y funciona en serverless.
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

function getPrismaClient(): PrismaClient {
  // En desarrollo Next recarga los módulos; reutilizamos el pool para no abrir
  // una conexión nueva por cada hot reload (Postgres tiene un límite duro).
  const existing = globalForPrisma.prisma;
  if (existing) return existing;

  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  return client;
}

// Cliente perezoso: la conexión se crea en el primer acceso a un modelo, no al
// importar el módulo. Sin esto, un entorno sin DATABASE_URL (por ejemplo un
// deploy mal configurado) revienta el render entero con un 500 y ningún
// try/catch puede atraparlo. Así el error aparece dentro de la action, que sí
// puede responder con un mensaje amable.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property);
    // Los métodos de Prisma dependen de `this`: devolverlos sin atar rompe
    // cosas como $transaction o $queryRawUnsafe.
    return typeof value === "function" ? value.bind(client) : value;
  },
});
