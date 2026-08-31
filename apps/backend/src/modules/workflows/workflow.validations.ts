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
})

export {
    createWorkflowSchema,
    updateWorkflowSchema,
}