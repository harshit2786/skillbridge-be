import prisma from "../lib/prisma.js";
export const isCourseCreator = async (req, res, next) => {
    try {
        const { projectId, courseId } = req.params;
        const userId = req.userId;
        if (typeof projectId !== "string") {
            res.status(400).json({ message: "Project ID is required" });
            return;
        }
        if (typeof courseId !== "string") {
            res.status(400).json({ message: "Course ID is required" });
            return;
        }
        if (!userId || req.role !== "trainer") {
            res
                .status(403)
                .json({ message: "Only trainers can perform this action" });
            return;
        }
        const course = await prisma.course.findUnique({
            where: { id: courseId, projectId },
            include: {
                creators: { select: { id: true } },
                project: { select: { adminId: true } },
            },
        });
        if (!course) {
            res.status(404).json({ message: "Course not found" });
            return;
        }
        const isCreator = course.creators.some((c) => c.id === userId);
        const isAdmin = course.project.adminId === userId;
        if (!isCreator && !isAdmin) {
            res
                .status(403)
                .json({
                message: "Only course creators or project admin can perform this action",
            });
            return;
        }
        next();
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
//# sourceMappingURL=isCourseCreator.js.map