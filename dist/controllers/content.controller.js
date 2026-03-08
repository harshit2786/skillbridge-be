import prisma from "../lib/prisma.js";
// GET /api/projects/:projectId/contents
export const getProjectContents = async (req, res) => {
    try {
        const { projectId } = req.params;
        if (typeof projectId !== "string") {
            res.status(400).json({ message: "Project ID is required" });
            return;
        }
        const userId = req.userId;
        const role = req.role;
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
        const isMember = role === "trainer"
            ? project.trainers.some((t) => t.id === userId)
            : project.trainees.some((t) => t.id === userId);
        if (!isMember) {
            res.status(403).json({ message: "You are not a member of this project" });
            return;
        }
        const contents = await prisma.projectContent.findMany({
            where: { projectId },
            include: {
                quiz: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        published: true,
                        creators: {
                            select: { id: true, name: true, email: true },
                        },
                    },
                },
                course: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        published: true,
                        creators: {
                            select: { id: true, name: true, email: true },
                        },
                    },
                },
            },
            orderBy: { position: "asc" },
        });
        // Trainees only see published content
        const filtered = role === "trainee"
            ? contents.filter((c) => {
                if (c.type === "QUIZ")
                    return c.quiz?.published;
                if (c.type === "COURSE")
                    return c.course?.published;
                return false;
            })
            : contents;
        res.status(200).json({ contents: filtered });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
// PUT /api/projects/:projectId/contents/reorder
export const reorderContents = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { order } = req.body;
        // order = [{ contentId: "uuid", position: 1 }, { contentId: "uuid", position: 2 }, ...]
        if (typeof projectId !== "string") {
            res.status(400).json({ message: "Project ID is required" });
            return;
        }
        if (!order || !Array.isArray(order) || order.length === 0) {
            res.status(400).json({ message: "order array is required" });
            return;
        }
        // Validate all content IDs belong to this project
        const existingContents = await prisma.projectContent.findMany({
            where: { projectId },
        });
        const existingIds = existingContents.map((c) => c.id);
        const orderIds = order.map((o) => o.contentId);
        const invalidIds = orderIds.filter((id) => !existingIds.includes(id));
        if (invalidIds.length > 0) {
            res.status(400).json({
                message: "Some content IDs don't belong to this project",
                invalidIds,
            });
            return;
        }
        if (orderIds.length !== existingIds.length) {
            res.status(400).json({
                message: `Expected ${existingIds.length} items, got ${orderIds.length}. All content items must be included.`,
            });
            return;
        }
        // Check for duplicate positions
        const positions = order.map((o) => o.position);
        const uniquePositions = new Set(positions);
        if (uniquePositions.size !== positions.length) {
            res.status(400).json({ message: "Duplicate positions are not allowed" });
            return;
        }
        // Use transaction to update all positions
        // First set all to negative to avoid unique constraint conflicts
        await prisma.$transaction([
            // Temporarily set positions to negative values
            ...order.map((item, index) => prisma.projectContent.update({
                where: { id: item.contentId },
                data: { position: -(index + 1) },
            })),
            // Then set to actual positions
            ...order.map((item) => prisma.projectContent.update({
                where: { id: item.contentId },
                data: { position: item.position },
            })),
        ]);
        // Fetch updated order
        const updatedContents = await prisma.projectContent.findMany({
            where: { projectId },
            include: {
                quiz: {
                    select: { id: true, name: true, published: true },
                },
                course: {
                    select: { id: true, name: true, published: true },
                },
            },
            orderBy: { position: "asc" },
        });
        res.status(200).json({
            message: "Content reordered successfully",
            contents: updatedContents,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};
//# sourceMappingURL=content.controller.js.map