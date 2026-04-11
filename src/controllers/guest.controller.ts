import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { generateToken } from "../utils/generateToken.js";

const DEMO_TRAINER_EMAIL = "demo@skillbridge.com";
const DEMO_TRAINEE_PHONE = "0000000000";

// POST /api/guest/login
export const guestLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role } = req.body;

    if (role !== "trainer" && role !== "trainee") {
      res.status(400).json({ message: "Role must be 'trainer' or 'trainee'" });
      return;
    }

    if (role === "trainer") {
      const trainer = await prisma.trainer.findUnique({
        where: { email: DEMO_TRAINER_EMAIL },
      });

      if (!trainer) {
        res.status(404).json({ message: "Demo trainer account not found. Run the seed script." });
        return;
      }

      const token = generateToken(trainer.id, "trainer");
      res.status(200).json({
        message: "Guest login successful",
        token,
        trainer: {
          id: trainer.id,
          email: trainer.email,
          name: trainer.name,
        },
      });
      return;
    }

    // role === "trainee"
    const trainee = await prisma.trainee.findUnique({
      where: { phone: DEMO_TRAINEE_PHONE },
    });

    if (!trainee) {
      res.status(404).json({ message: "Demo trainee account not found. Run the seed script." });
      return;
    }

    const token = generateToken(trainee.id, "trainee");
    res.status(200).json({
      message: "Guest login successful",
      token,
      trainee: {
        id: trainee.id,
        phone: trainee.phone,
        name: trainee.name,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
