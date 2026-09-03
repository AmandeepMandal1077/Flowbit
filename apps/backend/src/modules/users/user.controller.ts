import prisma from "@flowbit/db";
import type { Request, Response } from "express";
import { generateToken } from "../../shared/utils/jwt.token.js";
import { AppError } from "../../shared/utils/appError.js";

const getProfile = async (req: Request, res: Response) => {
    const userId = req.userId;
    if (!userId) {
        throw new AppError("Unauthorized", 401);
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            username: true,
            status: true,
            createdAt: true,
            updatedAt: true,
        }
    });

    if (!user) {
        throw new AppError("User not found", 404);
    }

    return res.status(200).json({
        success: true,
        data: user,
        message: "User profile fetched successfully",
    });
};

const createUser = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    const existingUser = await prisma.user.findUnique({
        where: { username }
    });

    if (existingUser) {
        throw new AppError("Username already exists", 409);
    }

    // todo: store hashed password
    const user = await prisma.user.create({
        data: {
            username,
            password
        },
        select: {
            id: true,
            username: true,
            status: true,
            createdAt: true,
        }
    });

    generateToken(user.id, res);

    return res.status(201).json({
        success: true,
        data: user,
        message: "User created successfully",
    });
};

const signInUser = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    const user = await prisma.user.findUnique({
        where: {
            username,
        }
    });

    if (!user || user.password !== password) {
        throw new AppError("Invalid username or password", 401);
    }

    generateToken(user.id, res);

    return res.status(200).json({
        success: true,
        data: user,
        message: "Signed-In"
    })
}

const updateUser = async (req: Request, res: Response) => { }

const deleteUser = async (req: Request, res: Response) => {
    const userId = req.userId;
    if (!userId) {
        throw new AppError("Unauthorized", 401);
    }

    await prisma.user.delete({
        where: { id: userId }
    });

    return res.status(200).json({
        success: true,
        message: "User deleted successfully"
    });
};

export {
    getProfile,
    createUser,
    updateUser,
    deleteUser,
    signInUser,
};
