/*
  Warnings:

  - A unique constraint covering the columns `[actionId,workflowRunId]` on the table `ActionExecution` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ActionExecution_actionId_workflowRunId_key" ON "ActionExecution"("actionId", "workflowRunId");
