import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";

// POST /api/projects/:projectId/courses/:courseId/sections
export const createCourseSection = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { courseId } = req.params;
    const { title, description } = req.body;
    if (typeof courseId !== "string") {
      res.status(400).json({ message: "Course ID is required" });
      return;
    }
    if (!title) {
      res.status(400).json({ message: "Section title is required" });
      return;
    }

    const lastSection = await prisma.courseSection.findFirst({
      where: { courseId },
      orderBy: { order: "desc" },
    });
    const nextOrder = lastSection ? lastSection.order + 1 : 0;

    const section = await prisma.courseSection.create({
      data: {
        courseId,
        title,
        description,
        order: nextOrder,
      },
    });

    res.status(201).json({
      message: "Section created successfully",
      section,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/projects/:projectId/courses/:courseId/sections
export const getCourseSections = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { courseId } = req.params;
    if (typeof courseId !== "string") {
      res.status(400).json({ message: "Course ID is required" });
      return;
    }
    const sections = await prisma.courseSection.findMany({
      where: { courseId },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
        _count: {
          select: { questions: true },
        },
      },
      orderBy: { order: "asc" },
    });

    res.status(200).json({ sections });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/projects/:projectId/courses/:courseId/sections/:sectionId
export const getCourseSectionById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { courseId, sectionId } = req.params;
    if (typeof courseId !== "string") {
      res.status(400).json({ message: "Course ID is required" });
      return;
    }
    if (typeof sectionId !== "string") {
      res.status(400).json({ message: "Section ID is required" });
      return;
    }
    const section = await prisma.courseSection.findUnique({
      where: { id: sectionId, courseId },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!section) {
      res.status(404).json({ message: "Section not found" });
      return;
    }

    res.status(200).json({ section });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/projects/:projectId/courses/:courseId/sections/:sectionId
export const updateCourseSection = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { courseId, sectionId } = req.params;
    const { title, description } = req.body;
    if (typeof courseId !== "string") {
      res.status(400).json({ message: "Course ID is required" });
      return;
    }
    if (typeof sectionId !== "string") {
      res.status(400).json({ message: "Section ID is required" });
      return;
    }
    const section = await prisma.courseSection.findUnique({
      where: { id: sectionId, courseId },
    });

    if (!section) {
      res.status(404).json({ message: "Section not found" });
      return;
    }

    const updated = await prisma.courseSection.update({
      where: { id: sectionId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
      },
    });

    res.status(200).json({
      message: "Section updated successfully",
      section: updated,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE /api/projects/:projectId/courses/:courseId/sections/:sectionId
export const deleteCourseSection = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { courseId, sectionId } = req.params;
    if (typeof courseId !== "string") {
      res.status(400).json({ message: "Course ID is required" });
      return;
    }
    if (typeof sectionId !== "string") {
      res.status(400).json({ message: "Section ID is required" });
      return;
    }
    const section = await prisma.courseSection.findUnique({
      where: { id: sectionId, courseId },
    });

    if (!section) {
      res.status(404).json({ message: "Section not found" });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.courseSection.delete({
        where: { id: sectionId },
      });

      const remaining = await tx.courseSection.findMany({
        where: { courseId },
        orderBy: { order: "asc" },
      });

      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i]!.order !== i) {
          await tx.courseSection.update({
            where: { id: remaining[i]!.id },
            data: { order: i },
          });
        }
      }
    });

    res.status(200).json({ message: "Section deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// PUT /api/projects/:projectId/courses/:courseId/sections/reorder
export const reorderCourseSections = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { courseId } = req.params;
    const { order } = req.body;
    if (typeof courseId !== "string") {
      res.status(400).json({ message: "Course ID is required" });
      return;
    }
    if (!order || !Array.isArray(order) || order.length === 0) {
      res.status(400).json({ message: "order array is required" });
      return;
    }

    const existing = await prisma.courseSection.findMany({
      where: { courseId },
    });

    const existingIds = existing.map((s) => s.id);
    const orderIds = order.map((o: { sectionId: string }) => o.sectionId);

    const invalidIds = orderIds.filter(
      (id: string) => !existingIds.includes(id),
    );
    if (invalidIds.length > 0) {
      res.status(400).json({
        message: "Some section IDs don't belong to this course",
        invalidIds,
      });
      return;
    }

    if (orderIds.length !== existingIds.length) {
      res.status(400).json({
        message: `Expected ${existingIds.length} sections, got ${orderIds.length}. All sections must be included.`,
      });
      return;
    }

    const positions = order.map((o: { order: number }) => o.order);
    if (new Set(positions).size !== positions.length) {
      res.status(400).json({ message: "Duplicate positions are not allowed" });
      return;
    }

    await prisma.$transaction([
      ...order.map(
        (item: { sectionId: string; order: number }, index: number) =>
          prisma.courseSection.update({
            where: { id: item.sectionId },
            data: { order: -(index + 1) },
          }),
      ),
      ...order.map((item: { sectionId: string; order: number }) =>
        prisma.courseSection.update({
          where: { id: item.sectionId },
          data: { order: item.order },
        }),
      ),
    ]);

    const updated = await prisma.courseSection.findMany({
      where: { courseId },
      include: {
        _count: { select: { questions: true } },
      },
      orderBy: { order: "asc" },
    });

    res.status(200).json({
      message: "Sections reordered successfully",
      sections: updated,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
