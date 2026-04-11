import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { generateToken } from "../utils/generateToken.js";
import { createAndSendOtp, verifyOtp } from "../services/otp.service.js";

// GET /api/trainee/list
export const listAllTrainees = async (req: Request, res: Response): Promise<void> => {
  try {
    const trainees = await prisma.trainee.findMany({
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    });
    res.status(200).json({ trainees });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/trainee/send-otp
export const sendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body;

    if (!phone) {
      res.status(400).json({ message: "Phone number is required" });
      return;
    }

    const sent = await createAndSendOtp(phone);

    if (!sent) {
      res.status(500).json({ message: "Failed to send OTP. Try again." });
      return;
    }

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/trainee/verify-otp
export const verifyOtpAndLogin = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      res.status(400).json({ message: "Phone number and OTP are required" });
      return;
    }

    // Verify OTP
    const result = await verifyOtp(phone, otp);

    if (!result.success) {
      res.status(401).json({ message: result.message });
      return;
    }

    // Find or create trainee
    let trainee = await prisma.trainee.findUnique({
      where: { phone },
    });

    let isNewUser = false;

    if (!trainee) {
      trainee = await prisma.trainee.create({
        data: { phone },
      });
      isNewUser = true;
    }

    const token = generateToken(trainee.id, "trainee");

    res.status(200).json({
      message: isNewUser ? "Account created successfully" : "Login successful",
      isNewUser,
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

// GET /api/trainee/me
export const getTraineeProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }
    const trainee = await prisma.trainee.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        name: true,
        projects_trainee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!trainee) {
      res.status(404).json({ message: "Trainee not found" });
      return;
    }

    res.status(200).json({ trainee });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/trainee/me
export const updateTraineeProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { name } = req.body;
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }
    const trainee = await prisma.trainee.update({
      where: { id: userId },
      data: { name },
      select: {
        id: true,
        phone: true,
        name: true,
      },
    });

    res.status(200).json({
      message: "Profile updated successfully",
      trainee,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
