import prisma from "../lib/prisma.js";
export const isAdmin = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const userId = req.userId;
        if (!userId || req.role !== "trainer" || typeof projectId !== "string") {
            res.status(403).json({ message: "Only trainers can perform this action" });
            return;
        }
        const project = await prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!project) {
            res.status(404).json({ message: "Project not found" });
            return;
        }
        if (project.adminId !== userId) {
            res.status(403).json({ message: "Only the project admin can perform this action" });
            return;
        }
        next();
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
        return;
    }
};
//# sourceMappingURL=isAdmin.js.map