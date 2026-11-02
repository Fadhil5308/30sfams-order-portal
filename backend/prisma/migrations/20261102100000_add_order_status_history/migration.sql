CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "changedById" TEXT,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderStatusHistory_orderId_createdAt_idx" ON "OrderStatusHistory"("orderId", "createdAt");
CREATE INDEX "OrderStatusHistory_changedById_idx" ON "OrderStatusHistory"("changedById");

ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_changedById_fkey"
  FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill safe markers for pre-existing orders. Do not invent intermediate transitions.
INSERT INTO "OrderStatusHistory" ("id", "orderId", "changedById", "fromStatus", "toStatus", "note", "createdAt")
SELECT
  'legacy-created-' || o."id",
  o."id",
  NULL,
  NULL,
  'PENDING'::"OrderStatus",
  'Pesanan dibuat sebelum timeline status diaktifkan. Riwayat transisi lama tidak tersedia.',
  o."createdAt"
FROM "Order" o;

INSERT INTO "OrderStatusHistory" ("id", "orderId", "changedById", "fromStatus", "toStatus", "note", "createdAt")
SELECT
  'legacy-current-' || o."id",
  o."id",
  NULL,
  NULL,
  o."status",
  'Snapshot status saat fitur timeline dipasang. Transisi di antara waktu pembuatan dan snapshot tidak direkam.',
  o."updatedAt"
FROM "Order" o
WHERE o."status" <> 'PENDING'::"OrderStatus";
