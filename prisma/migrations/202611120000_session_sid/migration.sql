-- Rename old Session table to preserve data
ALTER TABLE "Session" RENAME TO "Session_old";

-- Create new Session table with sid instead of tokenHash
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sid" TEXT NOT NULL UNIQUE,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,

    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Copy data from old table, mapping tokenHash to sid (sid = tokenHash for existing sessions)
INSERT INTO "Session" ("id", "sid", "userId", "createdAt", "expiresAt")
SELECT "id", "tokenHash", "userId", "createdAt", "expiresAt" FROM "Session_old";

-- Drop old table
DROP TABLE "Session_old";

-- Create index on expiresAt for session expiry lookups
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");