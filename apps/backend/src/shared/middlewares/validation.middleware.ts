import { ZodError, type ZodType } from "zod";
import { AppError } from "../utils/appError.js";
import type { NextFunction, Request, Response } from "express";

export const validate = (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
    const { data, success, error } = schema.safeParse(req.body);

    if (success) {
        req.body = data;
        return next();
    }

    let message = error.issues.map((issue) => `${issue.path.join(".")} : ${issue.message}`)
    return next(new AppError(message.join("\n"), 400));
}