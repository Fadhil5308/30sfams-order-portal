-- Additive migration: preserve existing user, order, resource, and stock records.
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
ALTER TABLE "User" ADD COLUMN "registrationStatus" "RegistrationStatus" NOT NULL DEFAULT 'APPROVED';
CREATE INDEX "User_registrationStatus_isActive_idx" ON "User"("registrationStatus", "isActive");

ALTER TYPE "NotificationType" ADD VALUE 'ACCOUNT_REGISTRATION';
ALTER TYPE "NotificationType" ADD VALUE 'ACCOUNT_STATUS';

CREATE TABLE "SpendingPeriod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    CONSTRAINT "SpendingPeriod_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SpendingPeriod_isCurrent_startAt_idx" ON "SpendingPeriod"("isCurrent", "startAt");
CREATE INDEX "SpendingPeriod_startAt_endAt_idx" ON "SpendingPeriod"("startAt", "endAt");
ALTER TABLE "SpendingPeriod" ADD CONSTRAINT "SpendingPeriod_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TYPE "GangCashEntryType" AS ENUM ('OPENING_BALANCE', 'ORDER_INCOME', 'EXPENSE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT');
CREATE TABLE "GangCashEntry" (
    "id" TEXT NOT NULL,
    "type" "GangCashEntryType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "orderId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GangCashEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GangCashEntry_orderId_key" ON "GangCashEntry"("orderId");
CREATE INDEX "GangCashEntry_type_createdAt_idx" ON "GangCashEntry"("type", "createdAt");
CREATE INDEX "GangCashEntry_createdAt_idx" ON "GangCashEntry"("createdAt");
ALTER TABLE "GangCashEntry" ADD CONSTRAINT "GangCashEntry_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GangCashEntry" ADD CONSTRAINT "GangCashEntry_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
