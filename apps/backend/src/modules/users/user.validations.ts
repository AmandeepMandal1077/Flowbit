import { z } from "zod"

const createUserSchema = z.object({
    username: z.string().min(5),
    password: z.string().min(8)
})

const signInUserSchema = z.object({
    username: z.string().min(5),
    password: z.string().min(8)
})

const updateUserSchema = z.object({
    username: z.string().min(5)
})

export {
    createUserSchema,
    updateUserSchema,
    signInUserSchema,
}