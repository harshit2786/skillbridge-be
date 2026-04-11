import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { generateToken } from "../utils/generateToken.js";
export const trainerLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ message: "Email and password are required" });
            return;
        }
        const trainer = await prisma.trainer.findUnique({
            where: { email },
        });
        if (!trainer) {
            res.status(401).json({ message: "Invalid email or password" });
            return;
        }
        const isPasswordValid = await bcrypt.compare(password, trainer.password);
        if (!isPasswordValid) {
            res.status(401).json({ message: "Invalid email or password" });
            return;
        }
        const token = generateToken(trainer.id, "trainer");
        res.status(200).json({
            message: "Login successful",
            token,
            trainer: {
                id: trainer.id,
                email: trainer.email,
                name: trainer.name,
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
// GET /api/trainer/list
export const listAllTrainers = async (req, res) => {
    try {
        const trainers = await prisma.trainer.findMany({
            select: { id: true, name: true, email: true },
            orderBy: { name: "asc" },
        });
        res.status(200).json({ trainers });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
export const getTrainerProfile = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }
        const trainer = await prisma.trainer.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                projects_trainer: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                project_admin: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        if (!trainer) {
            res.status(404).json({ message: "Trainer not found" });
            return;
        }
        res.status(200).json({ trainer });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
//# sourceMappingURL=trainer.auth.controller.js.map