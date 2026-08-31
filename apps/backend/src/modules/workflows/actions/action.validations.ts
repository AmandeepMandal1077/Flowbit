import { z } from "zod";

const createActionSchema = z.object({
    order: z.int().default(0),
    availableActionId: z.int(),
    configuration: z.record(z.string(), z.any()).optional().default({}), // need stronger config check
});

export {
    createActionSchema,
}