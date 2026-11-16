-- Add per-resource minimum stock thresholds without changing existing stock.
ALTER TABLE "Resource"
  ADD COLUMN IF NOT EXISTS "minStock" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Resource_isActive_minStock_idx"
  ON "Resource"("isActive", "minStock");
