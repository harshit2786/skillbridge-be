import prisma from "../lib/prisma.js";
// POST /api/projects/:projectId/quizzes/:quizId/sections
export const createSection = async (req, res) => {
    try {
        const { quizId } = req.params;
        const { title, description } = req.body;
        if (typeof quizId !== "string") {
            res.status(400).json({ message: "Quiz ID is required" });
            return;
        }
        if (!title) {
            res.status(400).json({ message: "Section title is required" });
            return;
        }
        // Get next order
        const lastSection = await prisma.quizSection.findFirst({
            where: { quizId },
            orderBy: { order: "desc" },
        });
        const nextOrder = lastSection ? lastSection.order + 1 : 0;
        const section = await prisma.quizSection.create({
            data: {
                quizId,
                title,
                description,
                order: nextOrder,
            },
        });
        res.status(201).json({
            message: "Section created successfully",
            section,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
// GET /api/projects/:projectId/quizzes/:quizId/sections
export const getSections = async (req, res) => {
    try {
        const { quizId } = req.params;
        if (typeof quizId !== "string") {
            res.status(400).json({ message: "Quiz ID is required" });
            return;
        }
        const sections = await prisma.quizSection.findMany({
            where: { quizId },
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
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
// GET /api/projects/:projectId/quizzes/:quizId/sections/:sectionId
export const getSectionById = async (req, res) => {
    try {
        const { quizId, sectionId } = req.params;
        if (typeof quizId !== "string") {
            res.status(400).json({ message: "Quiz ID is required" });
            return;
        }
        if (typeof sectionId !== "string") {
            res.status(400).json({ message: "Section ID is required" });
            return;
        }
        const section = await prisma.quizSection.findUnique({
            where: { id: sectionId, quizId },
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
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
// PATCH /api/projects/:projectId/quizzes/:quizId/sections/:sectionId
export const updateSection = async (req, res) => {
    try {
        const { quizId, sectionId } = req.params;
        const { title, description } = req.body;
        if (typeof quizId !== "string") {
            res.status(400).json({ message: "Quiz ID is required" });
            return;
        }
        if (typeof sectionId !== "string") {
            res.status(400).json({ message: "Section ID is required" });
            return;
        }
        const section = await prisma.quizSection.findUnique({
            where: { id: sectionId, quizId },
        });
        if (!section) {
            res.status(404).json({ message: "Section not found" });
            return;
        }
        const updated = await prisma.quizSection.update({
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
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
// DELETE /api/projects/:projectId/quizzes/:quizId/sections/:sectionId
export const deleteSection = async (req, res) => {
    try {
        const { quizId, sectionId } = req.params;
        if (typeof quizId !== "string") {
            res.status(400).json({ message: "Quiz ID is required" });
            return;
        }
        if (typeof sectionId !== "string") {
            res.status(400).json({ message: "Section ID is required" });
            return;
        }
        const section = await prisma.quizSection.findUnique({
            where: { id: sectionId, quizId },
        });
        if (!section) {
            res.status(404).json({ message: "Section not found" });
            return;
        }
        await prisma.$transaction(async (tx) => {
            // Delete the section (cascade deletes questions)
            await tx.quizSection.delete({
                where: { id: sectionId },
            });
            // Reorder remaining sections
            const remaining = await tx.quizSection.findMany({
                where: { quizId },
                orderBy: { order: "asc" },
            });
            for (let i = 0; i < remaining.length; i++) {
                if (remaining[i].order !== i) {
                    await tx.quizSection.update({
                        where: { id: remaining[i].id },
                        data: { order: i },
                    });
                }
            }
        });
        res.status(200).json({ message: "Section deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
// PUT /api/projects/:projectId/quizzes/:quizId/sections/reorder
export const reorderSections = async (req, res) => {
    try {
        const { quizId } = req.params;
        const { order } = req.body;
        // order = [{ sectionId: "id", order: 0 }, { sectionId: "id", order: 1 }, ...]
        if (typeof quizId !== "string") {
            res.status(400).json({ message: "Quiz ID is required" });
            return;
        }
        if (!order || !Array.isArray(order) || order.length === 0) {
            res.status(400).json({ message: "order array is required" });
            return;
        }
        const existing = await prisma.quizSection.findMany({
            where: { quizId },
        });
        const existingIds = existing.map((s) => s.id);
        const orderIds = order.map((o) => o.sectionId);
        const invalidIds = orderIds.filter((id) => !existingIds.includes(id));
        if (invalidIds.length > 0) {
            res.status(400).json({
                message: "Some section IDs don't belong to this quiz",
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
        const positions = order.map((o) => o.order);
        if (new Set(positions).size !== positions.length) {
            res.status(400).json({ message: "Duplicate positions are not allowed" });
            return;
        }
        await prisma.$transaction([
            // Temporarily set to negative
            ...order.map((item, index) => prisma.quizSection.update({
                where: { id: item.sectionId },
                data: { order: -(index + 1) },
            })),
            // Set actual positions
            ...order.map((item) => prisma.quizSection.update({
                where: { id: item.sectionId },
                data: { order: item.order },
            })),
        ]);
        const updated = await prisma.quizSection.findMany({
            where: { quizId },
            include: {
                _count: { select: { questions: true } },
            },
            orderBy: { order: "asc" },
        });
        res.status(200).json({
            message: "Sections reordered successfully",
            sections: updated,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
//# sourceMappingURL=quizSection.controller.js.map