/*
  Warnings:

  - You are about to drop the column `idempotentKey` on the `outbox` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "outbox" DROP COLUMN "idempotentKey";
