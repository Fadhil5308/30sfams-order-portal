-- Additive migration: favorite list and session revocation counter. Existing records remain untouched.
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "FavoriteResource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FavoriteResource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FavoriteResource_userId_resourceId_key" ON "FavoriteResource"("userId", "resourceId");
CREATE INDEX "FavoriteResource_userId_createdAt_idx" ON "FavoriteResource"("userId", "createdAt");
CREATE INDEX "FavoriteResource_resourceId_idx" ON "FavoriteResource"("resourceId");

ALTER TABLE "FavoriteResource" ADD CONSTRAINT "FavoriteResource_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FavoriteResource" ADD CONSTRAINT "FavoriteResource_resourceId_fkey"
  FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
