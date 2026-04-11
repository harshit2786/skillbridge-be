import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";

// POST /api/projects
export const createProject = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { name, description } = req.body;
    const trainerId = req.userId!;

    if (!name) {
      res.status(400).json({ message: "Project name is required" });
      return;
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        adminId: trainerId,
        trainers: {
          connect: { id: trainerId }, // admin is also a trainer in the project
        },
      },
    });

    res.status(201).json({
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/projects
export const getMyProjects = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId!;
    const role = req.role!;

    let projects;

    if (role === "trainer") {
      projects = await prisma.project.findMany({
        where: {
          trainers: {
            some: { id: userId },
          },
        },
        include: {
          admin: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: {
              trainers: true,
              trainees: true,
              quizes: true,
              courses: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      projects = await prisma.project.findMany({
        where: {
          trainees: {
            some: { id: userId },
          },
        },
        include: {
          admin: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: {
              trainers: true,
              trainees: true,
              quizes: true,
              courses: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    res.status(200).json({ projects });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/projects/:projectId
export const getProjectById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const userId = req.userId!;
    const role = req.role!;
    if (typeof projectId !== "string") {
      res.status(400).json({ message: "Project ID is required" });
      return;
    }
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        admin: {
          select: { id: true, name: true, email: true },
        },
        trainers: {
          select: { id: true, name: true, email: true },
        },
        trainees: {
          select: { id: true, name: true, phone: true },
        },
        quizes: {
          select: { id: true, name: true, published: true, createdAt: true },
        },
        courses: {
          select: { id: true, name: true, published: true, createdAt: true },
        },
      },
    });

    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    // Check if user is a member
    const isMember =
      role === "trainer"
        ? project.trainers.some((t) => t.id === userId)
        : project.trainees.some((t) => t.id === userId);

    if (!isMember) {
      res.status(403).json({ message: "You are not a member of this project" });
      return;
    }

    res.status(200).json({ project });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/projects/:projectId/trainers
export const addTrainersToProject = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { trainerIds } = req.body; // string[]
    if (typeof projectId !== "string") {
      res.status(400).json({ message: "Project ID is required" });
      return;
    }
    if (!trainerIds || !Array.isArray(trainerIds) || trainerIds.length === 0) {
      res.status(400).json({ message: "trainerIds array is required" });
      return;
    }

    // Verify all trainers exist
    const trainers = await prisma.trainer.findMany({
      where: { id: { in: trainerIds } },
    });

    if (trainers.length !== trainerIds.length) {
      res.status(400).json({ message: "One or more trainer IDs are invalid" });
      return;
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        trainers: {
          connect: trainerIds.map((id: string) => ({ id })),
        },
      },
      include: {
        trainers: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(200).json({
      message: "Trainers added successfully",
      trainers: project.trainers,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/projects/:projectId/trainees
export const addTraineesToProject = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { traineeIds } = req.body; // string[]
    if (typeof projectId !== "string") {
      res.status(400).json({ message: "Project ID is required" });
      return;
    }
    if (!traineeIds || !Array.isArray(traineeIds) || traineeIds.length === 0) {
      res.status(400).json({ message: "traineeIds array is required" });
      return;
    }

    const trainees = await prisma.trainee.findMany({
      where: { id: { in: traineeIds } },
    });

    if (trainees.length !== traineeIds.length) {
      res.status(400).json({ message: "One or more trainee IDs are invalid" });
      return;
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        trainees: {
          connect: traineeIds.map((id: string) => ({ id })),
        },
      },
      include: {
        trainees: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    res.status(200).json({
      message: "Trainees added successfully",
      trainees: project.trainees,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE /api/projects/:projectId/trainers/:trainerId
export const removeTrainerFromProject = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId, trainerId } = req.params;
    if (typeof projectId !== "string") {
      res.status(400).json({ message: "Project ID is required" });
      return;
    }
    if (typeof trainerId !== "string") {
      res.status(400).json({ message: "Trainer ID is required" });
      return;
    }
    // Can't remove the admin
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (project?.adminId === trainerId) {
      res.status(400).json({ message: "Cannot remove the project admin" });
      return;
    }

    await prisma.project.update({
      where: { id: projectId },
      data: {
        trainers: {
          disconnect: { id: trainerId },
        },
      },
    });

    res.status(200).json({ message: "Trainer removed from project" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/projects/:projectId
export const updateProject = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { name, description } = req.body;
    if (typeof projectId !== "string") {
      res.status(400).json({ message: "Project ID is required" });
      return;
    }
    if (!name || typeof name !== "string" || name.trim() === "") {
      res.status(400).json({ message: "Project name is required" });
      return;
    }
    const project = await prisma.project.update({
      where: { id: projectId },
      data: { name: name.trim(), description },
      select: { id: true, name: true, description: true, adminId: true },
    });
    res.status(200).json({ message: "Project updated successfully", project });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE /api/projects/:projectId
export const deleteProject = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId } = req.params;
    if (typeof projectId !== "string") {
      res.status(400).json({ message: "Project ID is required" });
      return;
    }
    await prisma.project.delete({ where: { id: projectId } });
    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE /api/projects/:projectId/trainees/:traineeId
export const removeTraineeFromProject = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId, traineeId } = req.params;
    if (typeof projectId !== "string") {
      res.status(400).json({ message: "Project ID is required" });
      return;
    }
    if (typeof traineeId !== "string") {
      res.status(400).json({ message: "Trainer ID is required" });
      return;
    }
    await prisma.project.update({
      where: { id: projectId },
      data: {
        trainees: {
          disconnect: { id: traineeId },
        },
      },
    });

    res.status(200).json({ message: "Trainee removed from project" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
