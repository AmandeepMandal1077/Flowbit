import prisma, { Prisma, WorkflowRunStatus, WorkflowStatus } from "@flowbit/db";
import { AppError } from "../../shared/utils/appError.js";

export type createWorkflowRunPayload = { actionId: number | null, inputPayload: Record<string, unknown> }

const createWorkflowRun = async (workflowId: string, payload: createWorkflowRunPayload) => {
    const workflow = await prisma.workflow.findUnique({
        where: {
            id: workflowId,
        }
    });

    if (!workflow) {
        throw new AppError("Workflow not found", 404);
    }

    if (workflow.status !== WorkflowStatus.ACTIVE) {
        throw new AppError("Workflow is not active", 400);
    }

    await prisma.$transaction(async (tx) => {
        const hasNoActions = payload.actionId === null;

        const workflowRun = await tx.workflowRun.create({
            data: {
                inputPayload: payload.inputPayload as Prisma.InputJsonObject,
                workflowId: workflowId,
                status: hasNoActions ? WorkflowRunStatus.SUCCESS : WorkflowRunStatus.PENDING,
                completedAt: hasNoActions ? new Date() : null,
            }
        });

        if (payload.actionId) {
            await tx.outbox.create({
                data: {
                    actionId: payload.actionId,
                    payload: payload.inputPayload as Prisma.InputJsonObject,
                    workflowRunId: workflowRun.id
                }
            });

            await tx.actionExecution.create({
                data: {
                    inputPayload: payload.inputPayload as Prisma.InputJsonObject,
                    actionId: payload.actionId,
                    workflowRunId: workflowRun.id
                }
            });
        }
    });
};

export { createWorkflowRun };