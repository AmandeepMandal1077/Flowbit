/*
  Warnings:

  - You are about to drop the column `actionStep` on the `outbox` table. All the data in the column will be lost.
  - Added the required column `actionId` to the `outbox` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "outbox" DROP COLUMN "actionStep",
ADD COLUMN     "actionId" INTEGER NOT NULL;
