import jwt from "jsonwebtoken"
import { AppError } from "./appError.js"
import cookieParser from "cookie-parser";
import type { NextFunction, Request, Response } from "express";

export const generateToken = (userId: string, res: Response) => {
    const payload = { userId }

    if (!process.env.SECRET) {
        throw new AppError("JWT secret missing", 500);
    }
    const token = jwt.sign(
        payload,
        process.env.SECRET,
    )
    res.cookie("token", token, {
        maxAge: parseInt(process.env.TOKEN_EXPIRY || "900000"), //15 minutes
        httpOnly: true,
        sameSite: "strict",
        secure: true,
    })
}

export interface CustomJwtPayload extends jwt.JwtPayload {
    userId: string;
}

export const verifyJWTToken = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.token;
    if (!token) {
        return next(new AppError("Unauthorized: No token provided", 401));
    }

    if (!process.env.SECRET) {
        return next(new AppError("JWT secret missing", 500));
    }

    try {
        const payload = jwt.verify(token, process.env.SECRET) as CustomJwtPayload;
        req.userId = payload.userId;
        next();
    } catch (error) {
        return next(new AppError("Unauthorized: Invalid or expired token", 401));
    }
}