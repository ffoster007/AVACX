/*
  Warnings:

  - A unique constraint covering the columns `[userId,workspaceId]` on the table `SnipWorkspacePath` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `SnipHistoryEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `SnipWorkspacePath` table without a default value. This is not possible if the table is not empty.

*/

-- Delete existing data that doesn't have userId (required before adding NOT NULL column)
DELETE FROM "SnipHistoryEntry";
DELETE FROM "SnipWorkspacePath";

-- DropIndex
DROP INDEX "SnipWorkspacePath_workspaceId_key";

-- AlterTable
ALTER TABLE "SnipHistoryEntry" ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "SnipWorkspacePath" ADD COLUMN     "userId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "SnipHistoryEntry_userId_triggeredAt_idx" ON "SnipHistoryEntry"("userId", "triggeredAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SnipWorkspacePath_userId_workspaceId_key" ON "SnipWorkspacePath"("userId", "workspaceId");

-- AddForeignKey
ALTER TABLE "SnipWorkspacePath" ADD CONSTRAINT "SnipWorkspacePath_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnipHistoryEntry" ADD CONSTRAINT "SnipHistoryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
