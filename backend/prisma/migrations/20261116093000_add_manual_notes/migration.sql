-- Add persistent manual notes for Super Admins without modifying existing data.
CREATE TABLE IF NOT EXISTS "ManualNote" (
  "id" TEXT NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "category" VARCHAR(24) NOT NULL DEFAULT 'UMUM',
  "content" TEXT NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManualNote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ManualNote_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ManualNote_createdAt_idx"
  ON "ManualNote"("createdAt");
CREATE INDEX IF NOT EXISTS "ManualNote_category_createdAt_idx"
  ON "ManualNote"("category", "createdAt");
CREATE INDEX IF NOT EXISTS "ManualNote_createdById_idx"
  ON "ManualNote"("createdById");
