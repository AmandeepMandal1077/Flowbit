import type { ZodError } from "zod"

export const zodErrorMessage = (error: ZodError) => {
    return error.issues.map((issue) => `${issue.path.join(".")} : ${issue.message}`).join("\n")
}