import type { Request, Response } from "express";
import { createWorkflowSchema, receiveWebhookSchema, updateWorkflowSchema } from "./workflow.validations.js";
import { AppError } from "../../shared/utils/appError.js";
import { zodErrorMessage } from "../../shared/utils/zodErrorMessage.js";
import prisma, { WorkflowStatus } from "@flowbit/db";
import { validateConfigFields, type Config } from "../../shared/utils/validateConfig.js";
import { createWorkflowRun, type createWorkflowRunPayload } from "./workflow.service.js";

const createWorkflow = async (req: Request, res: Response) => {

    const { data, success, error } = createWorkflowSchema.safeParse(req.body);
    if (!success) {
        throw new AppError(zodErrorMessage(error), 400);
    }

    const { name, availableTriggerId, description } = data;

    const userId = req.userId!;

    const availableTrigger = await prisma.availableTrigger.findUnique({
        where: { id: availableTriggerId }
    });

    if (!availableTrigger) {
        throw new AppError("Available trigger not found", 404);
    }

    const workflow = await prisma.$transaction(async (tx) => {
        const trigger = await tx.trigger.create({
            data: {
                availableTriggerId
            }
        });

        const createdWorkflow = await tx.workflow.create({
            data: {
                name: name,
                description: description || null,
                userId: userId,
                triggerId: trigger.id
            },
            include: {
                triggers: {
                    include: {
                        type: true
                    }
                }
            }
        });

        return createdWorkflow;
    });

    return res.status(201).json({
        success: true,
        data: workflow,
        message: "Workflow created successfully"
    });
};

const getWorkflow = async (req: Request, res: Response) => {
    const id = req.params.workflowId as string;
    const userId = req.userId!;

    if (!id) {
        throw new AppError("Workflow ID is required", 400);
    }

    const workflow = await prisma.workflow.findFirst({
        where: {
            id,
            userId,
        },
        include: {
            triggers: {
                include: {
                    type: true
                }
            },
            actions: {
                include: {
                    type: true
                },
                orderBy: {
                    order: "asc"
                }
            }
        }
    });

    if (!workflow) {
        throw new AppError("Workflow not found", 404);
    }

    return res.status(200).json({
        success: true,
        data: workflow,
        message: "Workflow fetched successfully"
    });
};

const listWorkflows = async (req: Request, res: Response) => {
    const userId = req.userId!;

    const workflows = await prisma.workflow.findMany({
        where: {
            userId: userId
        },
        include: {
            triggers: {
                include: {
                    type: true
                }
            }
        },
        orderBy: {
            createdAt: "desc"
        }
    });

    return res.status(200).json({
        success: true,
        data: workflows,
        message: "Workflows fetched successfully"
    });
};

const updateWorkflow = async (req: Request, res: Response) => {
    const id = req.params.workflowId as string;
    const userId = req.userId!;

    if (!id) {
        throw new AppError("Workflow ID is required", 400);
    }

    const { data, success, error } = updateWorkflowSchema.safeParse(req.body);

    if (!success) {
        throw new AppError(zodErrorMessage(error), 400);
    }

    const { name, description, availableTriggerId, status } = data;

    const existingWorkflow = await prisma.workflow.findFirst({
        where: {
            id,
            userId
        }
    });

    if (!existingWorkflow) {
        throw new AppError("Workflow not found", 404);
    }

    if (availableTriggerId !== undefined) {
        const availableTrigger = await prisma.availableTrigger.findUnique({
            where: { id: availableTriggerId }
        });
        if (!availableTrigger) {
            throw new AppError("Available trigger not found", 404);
        }
    }

    const result = await prisma.$transaction(async (tx) => {
        const updateData: { name?: string; description?: string | null; status?: WorkflowStatus; } = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description || null;
        if (status !== undefined) updateData.status = status;

        const updatedWorkflow = await tx.workflow.update({
            where: { id },
            data: updateData,
        });

        let updatedTrigger = null;
        if (availableTriggerId !== undefined && existingWorkflow.triggerId) {
            updatedTrigger = await tx.trigger.update({
                where: { id: existingWorkflow.triggerId },
                data: {
                    availableTriggerId
                }
            });
        }

        return { workflow: updatedWorkflow, trigger: updatedTrigger };
    });

    return res.status(200).json({
        success: true,
        data: result,
        message: "Workflow updated successfully"
    });
};

const deleteWorkflow = async (req: Request, res: Response) => {
    const id = req.params.workflowId as string;
    const userId = req.userId!;

    if (!id) {
        throw new AppError("Workflow ID is required", 400);
    }

    const existingWorkflow = await prisma.workflow.findFirst({
        where: {
            id,
            userId
        }
    });

    if (!existingWorkflow) {
        throw new AppError("Workflow not found", 404);
    }

    await prisma.workflow.delete({
        where: { id }
    });

    return res.status(200).json({
        success: true,
        message: "Workflow deleted successfully"
    });
};

const receiveWebhook = async (req: Request, res: Response) => {
    const workflowId = req.params.workflowId as string;

    const { data, success, error } = receiveWebhookSchema.safeParse(req.body);

    if (!success) {
        throw new AppError(zodErrorMessage(error), 400);
    }

    const { inputPayload } = data;

    const workflow = await prisma.workflow.findUnique({
        where: {
            id: workflowId
        },
        include: {
            actions: {
                include: {
                    type: true,
                },
                orderBy: { order: "asc" }
            }
        }
    });

    if (!workflow) {
        throw new AppError("Workflow not found", 404);
    }

    if (workflow.status !== WorkflowStatus.ACTIVE) {
        throw new AppError("Workflow is not active", 400);
    }

    const actionConfigMetadata = workflow.actions[0]?.type.metadata as Config;

    const isValidConfig = validateConfigFields(actionConfigMetadata, inputPayload);
    if (!isValidConfig) {
        throw new AppError("Config is incomplete or missing required fields", 400);
    }

    const firstActionId = workflow.actions[0]?.id || -1;

    const payload: createWorkflowRunPayload = {
        actionId: firstActionId,
        inputPayload: inputPayload
    };

    await createWorkflowRun(workflowId, payload);

    res.status(201).json({
        success: true,
        message: "Workflow run created successfully",
    });
};

export {
    createWorkflow,
    getWorkflow,
    listWorkflows,
    updateWorkflow,
    deleteWorkflow,
    receiveWebhook,
};

