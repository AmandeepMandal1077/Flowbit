-- AlterTable
ALTER TABLE "ActionExecution" ALTER COLUMN "lastAttemptedAt" DROP NOT NULL,
ALTER COLUMN "lastAttemptedAt" DROP DEFAULT;
