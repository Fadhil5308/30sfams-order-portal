-- Add the new resource category without changing existing resource records.
ALTER TYPE "ResourceCategory" ADD VALUE IF NOT EXISTS 'AMMO';

-- Store member rank with a safe default for all existing accounts.
CREATE TYPE "UserRank" AS ENUM (
  'HANGAROUND',
  'YOUNGBOYS',
  'HOODBOYS',
  'HOOD_PRESIDENT',
  'SHOOT_CALLER',
  'UNDER_OG',
  'OG'
);

ALTER TABLE "User"
ADD COLUMN "rank" "UserRank" NOT NULL DEFAULT 'HANGAROUND';
