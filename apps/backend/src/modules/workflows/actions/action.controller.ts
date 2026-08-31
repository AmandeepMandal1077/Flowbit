import type { Request, Response } from "express";
import { createActionSchema } from "./action.validations.js";
import { AppError } from "../../../shared/utils/appError.js";
import { zodErrorMessage } from "../../../shared/utils/zodErrorMessage.js";
import prisma from "@flowbit/db";

const createAction = async (req: Request, res: Response) => {
    const workflowId = req.params.workflowId as string;
    const userId = req.userId!;

    if (!workflowId) {
        throw new AppError("Workflow ID is required", 400);
    }

    const workflow = await prisma.workflow.findFirst({
        where: {
            id: workflowId,
            userId,
        }
    });

    if (!workflow) {
        throw new AppError("Workflow not found", 404);
    }

    const { data, success, error } = createActionSchema.safeParse(req.body);
    if (!success) {
        throw new AppError(zodErrorMessage(error), 400);
    }

    const { availableActionId, configuration, order } = data;

    const availableAction = await prisma.availableAction.findUnique({
        where: { id: availableActionId }
    });

    if (!availableAction) {
        throw new AppError("Available action not found", 404);
    }

    const requiredConfigKeys = Object.keys(availableAction.metadata || {});

    const requiredFieldsExist = requiredConfigKeys.every((key) => {
        const value = configuration[key];
        return value !== undefined && value !== null;
    });

    if (!requiredFieldsExist) {
        throw new AppError("Config is incomplete or missing required fields", 400);
    }

    const action = await prisma.action.create({
        data: {
            order,
            configuration: configuration ?? {},
            workflowId,
            availableActionId,
        },
        include: {
            type: true,
        }
    });

    return res.status(201).json({
        success: true,
        data: action,
        message: "Action created successfully"
    });
};

const listActions = async (req: Request, res: Response) => {
    const workflowId = req.params.workflowId as string;
    const userId = req.userId!;

    if (!workflowId) {
        throw new AppError("Workflow ID is required", 400);
    }

    const workflow = await prisma.workflow.findFirst({
        where: {
            id: workflowId,
            userId,
        }
    });

    if (!workflow) {
        throw new AppError("Workflow not found", 404);
    }

    const actions = await prisma.action.findMany({
        where: {
            workflowId,
        },
        include: {
            type: true,
        },
        orderBy: {
            order: "asc"
        }
    });

    return res.status(200).json({
        success: true,
        data: actions,
        message: "Actions fetched successfully"
    });
};

export {
    createAction,
    listActions,
}