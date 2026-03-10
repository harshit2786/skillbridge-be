import prisma from "../lib/prisma.js";
import { uploadToGCS, deleteFromGCS } from "../lib/gcs.js";
import { addResourceJob } from "../lib/queue.js";
import { deleteVectorsByResourceId } from "../lib/qdrant.js";
// POST /api/projects/:projectId/resources
export const uploadResource = async (req, res) => {
    try {
        const { projectId } = req.params;
        const trainerId = req.userId;
        const file = req.file;
        if (typeof projectId !== "string") {
            res.status(400).json({ message: "Project ID is required" });
            return;
        }
        if (!file) {
            res.status(400).json({ message: "PDF file is required" });
            return;
        }
        // Upload to GCS
        const destination = `projects/${projectId}/${Date.now()}-${file.originalname}`;
        const { refId, url } = await uploadToGCS(file, destination);
        // Save to DB
        const resource = await prisma.resource.create({
            data: {
                refId,
                filename: file.originalname,
                url,
                mimeType: file.mimetype,
                size: file.size,
                projectId,
                uploadedBy: trainerId,
                status: "PROCESSING",
            },
        });
        // Add to processing queue
        await addResourceJob({
            resourceId: resource.id,
            refId: resource.refId,
            projectId,
            filename: resource.filename,
        });
        res.status(201).json({
            message: "Resource uploaded and queued for processing",
            resource: {
                id: resource.id,
                filename: resource.filename,
                status: resource.status,
                createdAt: resource.createdAt,
            },
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// GET /api/projects/:projectId/resources
export const getProjectResources = async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.userId;
        const role = req.role;
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
        const isMember = role === "trainer"
            ? project.trainers.some((t) => t.id === userId)
            : project.trainees.some((t) => t.id === userId);
        if (!isMember) {
            res.status(403).json({ message: "You are not a member of this project" });
            return;
        }
        const resources = await prisma.resource.findMany({
            where: {
                projectId,
                // Trainees only see processed resources
                ...(role === "trainee" && { status: "PROCESSED" }),
            },
            select: {
                id: true,
                filename: true,
                url: true,
                size: true,
                status: true,
                createdAt: true,
                uploader: {
                    select: { id: true, name: true, email: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        res.status(200).json({ resources });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
// GET /api/projects/:projectId/resources/:resourceId
export const getResourceById = async (req, res) => {
    try {
        const { projectId, resourceId } = req.params;
        const userId = req.userId;
        const role = req.role;
        if (typeof projectId !== "string" || typeof resourceId !== "string") {
            res.status(400).json({ message: "Project ID and Resource ID are required" });
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
        const isMember = role === "trainer"
            ? project.trainers.some((t) => t.id === userId)
            : project.trainees.some((t) => t.id === userId);
        if (!isMember) {
            res.status(403).json({ message: "You are not a member of this project" });
            return;
        }
        const resource = await prisma.resource.findUnique({
            where: { id: resourceId, projectId },
            include: {
                uploader: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
        if (!resource) {
            res.status(404).json({ message: "Resource not found" });
            return;
        }
        if (role === "trainee" && resource.status !== "PROCESSED") {
            res.status(403).json({ message: "Resource is not available yet" });
            return;
        }
        res.status(200).json({ resource });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
// DELETE /api/projects/:projectId/resources/:resourceId
export const deleteResource = async (req, res) => {
    try {
        const { projectId, resourceId } = req.params;
        if (typeof projectId !== "string" || typeof resourceId !== "string") {
            res.status(400).json({ message: "Project ID and Resource ID are required" });
            return;
        }
        const resource = await prisma.resource.findUnique({
            where: { id: resourceId, projectId },
        });
        if (!resource) {
            res.status(404).json({ message: "Resource not found" });
            return;
        }
        // Delete from GCS
        try {
            await deleteFromGCS(resource.refId);
        }
        catch (err) {
            console.error("GCS deletion error:", err);
        }
        // Delete vectors from Qdrant
        try {
            await deleteVectorsByResourceId(resourceId);
        }
        catch (err) {
            console.error("Qdrant deletion error:", err);
        }
        // Delete from DB
        await prisma.resource.delete({
            where: { id: resourceId },
        });
        res.status(200).json({ message: "Resource deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
//# sourceMappingURL=resource.controller.js.map