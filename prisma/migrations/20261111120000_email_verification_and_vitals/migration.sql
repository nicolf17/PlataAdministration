-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" DATETIME;

-- CreateTable
CREATE TABLE "PendingSignup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME NOT NULL,
    "lastSentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingSignup_email_key" ON "PendingSignup"("email");

-- CreateIndex
CREATE INDEX "PendingSignup_expiresAt_idx" ON "PendingSignup"("expiresAt");

-- CreateTable
CREATE TABLE "WebVital" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "rating" TEXT,
    "path" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "WebVital_name_createdAt_idx" ON "WebVital"("name", "createdAt");

-- Backfill: las cuentas creadas antes de la verificación por correo ya estaban en uso.
UPDATE "User" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL;
