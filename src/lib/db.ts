import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "Falta DATABASE_URL. Copiá .env.example a .env y volvé a intentar.",
    );
  }

  // better-sqlite3 es síncrono y no necesita un servidor: ideal para uso local.
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

// En desarrollo Next recarga los módulos; reutilizamos la conexión para no
// abrir un descriptor de archivo por cada hot reload.
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
