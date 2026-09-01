import { z } from "zod";

const createWorkflowSchema = z.object({
    name: z.string().trim().min(5),
    description: z.string().trim().min(5).optional(),
    availableTriggerId: z.int(),
})

const updateWorkflowSchema = z.object({
    name: z.string().trim().min(5).optional(),
    description: z.string().trim().min(5).optional(),
    availableTriggerId: z.int().optional(),
    status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
})

const receiveWebhookSchema = z.object({
    inputPayload: z.record(z.string(), z.unknown()).default({})
})

export {
    createWorkflowSchema,
    updateWorkflowSchema,
    receiveWebhookSchema,
}