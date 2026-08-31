import express, { type NextFunction, type Request, type Response } from "express"
import { AppError } from "../utils/appError.js"

export const errorHandler = async (err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message
        })
    }

    console.error("Unhandled Error:", err)

    return res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === "production" ? "Internal Server Error" : (err?.message || "Internal Server Error")
    })
}