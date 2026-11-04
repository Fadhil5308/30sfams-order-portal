-- Add a stash-only resource category without changing existing resource or stock rows.
ALTER TYPE "ResourceCategory" ADD VALUE IF NOT EXISTS 'OTHER';
