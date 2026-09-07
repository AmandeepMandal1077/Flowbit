import prisma, { ActionStatus, Prisma, WorkflowRunStatus, WorkflowStatus } from "@flowbit/db";
import { AppError } from "../../shared/utils/appError.js";
import { validateConfigFields, type Config } from "../../shared/utils/validateConfig.js";
import { resolveTemplate } from "../../shared/utils/resolveTemplate.js";

export type createWorkflowRunPayload = { actionId: number | null, inputPayload: Record<string, unknown> }

// todo: return created workflow run id
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

    return await prisma.$transaction(async (tx) => {
        const firstAction = await tx.action.findFirst({
            where: {
                workflowId: workflow.id
            },
            orderBy: {
                order: "asc",
            },
            include: {
                type: true,
            }
        })

        if(!firstAction) {
            return await tx.workflowRun.create({
                data: {
                    inputPayload: payload.inputPayload as Prisma.InputJsonObject,
                    workflowId: workflowId,
                    status: WorkflowRunStatus.SUCCESS,
                    completedAt: new Date(),
                }
            });
        }

        const workflowRun = await tx.workflowRun.create({
            data: {
                inputPayload: payload.inputPayload as Prisma.InputJsonObject,
                workflowId: workflowId,
                status: WorkflowRunStatus.PENDING,
            }
        });

        resolveTemplate(payload.inputPayload, firstAction.configuration as Config, workflowRun.id);
        const {success, missingFields, resolvedFieldValues} = validateConfigFields(firstAction.type.metadata as any, payload.inputPayload, {})

        if(missingFields.length > 0) {
            await tx.actionExecution.create({
                data: {
                    actionId: firstAction.id,
                    workflowRunId: workflowRun.id,
                    inputPayload: resolvedFieldValues as Prisma.InputJsonValue,
                    error: {missingFields} as Prisma.InputJsonValue,
                    status: ActionStatus.INVALID_PAYLOAD,
                    completedAt: new Date(),
                }
            });

            await tx.workflowRun.update({
                data: {
                    status: WorkflowRunStatus.FAILED,
                    completedAt: new Date(),
                },
                where: {
                    id: workflowRun.id,
                }
            });

            return workflowRun;
        }

        await tx.actionExecution.create({
            data: {
                actionId: firstAction.id,
                workflowRunId: workflowRun.id,
                inputPayload: resolvedFieldValues as Prisma.InputJsonValue,
            }
        });

        await tx.outbox.create({
            data: {
                actionId: firstAction.id,
                payload: resolvedFieldValues as Prisma.InputJsonValue,
                workflowRunId: workflowRun.id
            }
        })

        return workflowRun;
    });
};

export { createWorkflowRun };