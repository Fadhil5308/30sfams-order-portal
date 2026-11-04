-- Soft-delete member accounts while preserving their orders and audit history.
ALTER TABLE "User"
ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "User_deletedAt_idx"
ON "User"("deletedAt");
