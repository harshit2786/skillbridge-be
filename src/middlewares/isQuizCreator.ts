import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";

export const isQuizCreator = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { projectId, quizId } = req.params;
    const userId = req.userId;
    if (typeof projectId !== "string") {
      res.status(400).json({ message: "Project ID is required" });
      return;
    }
    if (typeof quizId !== "string") {
      res.status(400).json({ message: "Quiz ID is required" });
      return;
    }
    if (typeof projectId !== "string") {
      res.status(400).json({ message: "Project ID is required" });
      return;
    }
    if (!userId || req.role !== "trainer") {
      res
        .status(403)
        .json({ message: "Only trainers can perform this action" });
      return;
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId, projectId },
      include: {
        creators: { select: { id: true } },
        project: { select: { adminId: true } },
      },
    });

    if (!quiz) {
      res.status(404).json({ message: "Quiz not found" });
      return;
    }

    const isCreator = quiz.creators.some((c) => c.id === userId);
    const isAdmin = quiz.project.adminId === userId;

    if (!isCreator && !isAdmin) {
      res
        .status(403)
        .json({
          message:
            "Only quiz creators or project admin can perform this action",
        });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
