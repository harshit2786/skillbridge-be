import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";

// POST /api/projects/:projectId/courses
export const createCourse = async (
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
    if (!name) {
      res.status(400).json({ message: "Course name is required" });
      return;
    }

    const lastContent = await prisma.projectContent.findFirst({
      where: { projectId },
      orderBy: { position: "desc" },
    });
    const nextPosition = lastContent ? lastContent.position + 1 : 1;

    const course = await prisma.$transaction(async (tx) => {
      const newCourse = await tx.course.create({
        data: {
          name,
          description,
          projectId,
        },
      });

      await tx.projectContent.create({
        data: {
          projectId,
          type: "COURSE",
          courseId: newCourse.id,
          position: nextPosition,
        },
      });

      return newCourse;
    });

    res.status(201).json({
      message: "Course created successfully",
      course,
      position: nextPosition,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/projects/:projectId/courses
export const getCoursesByProject = async (
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
    // Verify membership
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        trainers: { select: { id: true } },
        trainees: { select: { id: true } },
      },
    });

    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    const isMember =
      role === "trainer"
        ? project.trainers.some((t) => t.id === userId)
        : project.trainees.some((t) => t.id === userId);

    if (!isMember) {
      res.status(403).json({ message: "You are not a member of this project" });
      return;
    }

    const courses = await prisma.course.findMany({
      where: {
        projectId,
        ...(role === "trainee" && { published: true }),
      },
      include: {
        creators: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ courses });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/projects/:projectId/courses/:courseId
export const getCourseById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId, courseId } = req.params;
    const userId = req.userId!;
    const role = req.role!;
    if (typeof projectId !== "string") {
      res.status(400).json({ message: "Project ID is required" });
      return;
    }
    if (typeof courseId !== "string") {
      res.status(400).json({ message: "Course ID is required" });
      return;
    }
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        trainers: { select: { id: true } },
        trainees: { select: { id: true } },
      },
    });

    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    const isMember =
      role === "trainer"
        ? project.trainers.some((t) => t.id === userId)
        : project.trainees.some((t) => t.id === userId);

    if (!isMember) {
      res.status(403).json({ message: "You are not a member of this project" });
      return;
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId, projectId },
      include: {
        creators: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!course) {
      res.status(404).json({ message: "Course not found" });
      return;
    }

    if (role === "trainee" && !course.published) {
      res.status(403).json({ message: "This course is not published yet" });
      return;
    }

    res.status(200).json({ course });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/projects/:projectId/courses/:courseId/creators
export const addCreatorsToCourse = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId, courseId } = req.params;
    const { trainerIds } = req.body;
    if (typeof projectId !== "string") {
      res.status(400).json({ message: "Project ID is required" });
      return;
    }
    if (typeof courseId !== "string") {
      res.status(400).json({ message: "Course ID is required" });
      return;
    }
    if (!trainerIds || !Array.isArray(trainerIds) || trainerIds.length === 0) {
      res.status(400).json({ message: "trainerIds array is required" });
      return;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        trainers: { select: { id: true } },
      },
    });

    const projectTrainerIds = project?.trainers.map((t) => t.id) || [];
    const invalidTrainers = trainerIds.filter(
      (id: string) => !projectTrainerIds.includes(id),
    );

    if (invalidTrainers.length > 0) {
      res.status(400).json({
        message: "Some trainers are not members of this project",
        invalidTrainers,
      });
      return;
    }

    const course = await prisma.course.update({
      where: { id: courseId, projectId },
      data: {
        creators: {
          connect: trainerIds.map((id: string) => ({ id })),
        },
      },
      include: {
        creators: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(200).json({
      message: "Creators added to course",
      creators: course.creators,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE /api/projects/:projectId/courses/:courseId/creators/:trainerId
export const removeCreatorFromCourse = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId, courseId, trainerId } = req.params;
    if (typeof projectId !== "string") {
      res.status(400).json({ message: "Project ID is required" });
      return;
    }
    if (typeof courseId !== "string") {
      res.status(400).json({ message: "Course ID is required" });
      return;
    }
    if (typeof trainerId !== "string") {
      res.status(400).json({ message: "Trainer ID is required" });
      return;
    }

    await prisma.course.update({
      where: { id: courseId, projectId },
      data: {
        creators: {
          disconnect: { id: trainerId },
        },
      },
    });

    res.status(200).json({ message: "Creator removed from course" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/projects/:projectId/courses/:courseId/publish
export const toggleCoursePublish = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId, courseId } = req.params;
    if (typeof projectId !== "string") {
      res.status(400).json({ message: "Project ID is required" });
      return;
    }
    if (typeof courseId !== "string") {
      res.status(400).json({ message: "Course ID is required" });
      return;
    }
    const course = await prisma.course.findUnique({
      where: { id: courseId, projectId },
    });

    if (!course) {
      res.status(404).json({ message: "Course not found" });
      return;
    }

    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: {
        published: !course.published,
      },
    });

    res.status(200).json({
      message: `Course ${updatedCourse.published ? "published" : "unpublished"} successfully`,
      course: updatedCourse,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
