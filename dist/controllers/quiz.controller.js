import prisma from "../lib/prisma.js";
// POST /api/projects/:projectId/quizzes
export const createQuiz = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { name, description } = req.body;
        if (typeof projectId !== "string") {
            res.status(400).json({ message: "Project ID is required" });
            return;
        }
        if (!name) {
            res.status(400).json({ message: "Quiz name is required" });
            return;
        }
        // Get the next position
        const lastContent = await prisma.projectContent.findFirst({
            where: { projectId },
            orderBy: { position: "desc" },
        });
        const nextPosition = lastContent ? lastContent.position + 1 : 1;
        // Create quiz and content entry in a transaction
        const quiz = await prisma.$transaction(async (tx) => {
            const newQuiz = await tx.quiz.create({
                data: {
                    name,
                    description,
                    projectId,
                },
            });
            await tx.projectContent.create({
                data: {
                    projectId,
                    type: "QUIZ",
                    quizId: newQuiz.id,
                    position: nextPosition,
                },
            });
            return newQuiz;
        });
        res.status(201).json({
            message: "Quiz created successfully",
            quiz,
            position: nextPosition,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
// GET /api/projects/:projectId/quizzes
export const getQuizzesByProject = async (req, res) => {
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
        // Trainees can only see published quizzes
        const quizzes = await prisma.quiz.findMany({
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
        res.status(200).json({ quizzes });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
// GET /api/projects/:projectId/quizzes/:quizId
export const getQuizById = async (req, res) => {
    try {
        const { projectId, quizId } = req.params;
        const userId = req.userId;
        const role = req.role;
        if (typeof projectId !== "string") {
            res.status(400).json({ message: "Project ID is required" });
            return;
        }
        if (typeof quizId !== "string") {
            res.status(400).json({ message: "Quiz ID is required" });
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
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId, projectId },
            include: {
                creators: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
        if (!quiz) {
            res.status(404).json({ message: "Quiz not found" });
            return;
        }
        if (role === "trainee" && !quiz.published) {
            res.status(403).json({ message: "This quiz is not published yet" });
            return;
        }
        res.status(200).json({ quiz });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
// POST /api/projects/:projectId/quizzes/:quizId/creators
export const addCreatorsToQuiz = async (req, res) => {
    try {
        const { projectId, quizId } = req.params;
        const { trainerIds } = req.body;
        if (typeof projectId !== "string") {
            res.status(400).json({ message: "Project ID is required" });
            return;
        }
        if (typeof quizId !== "string") {
            res.status(400).json({ message: "Quiz ID is required" });
            return;
        }
        if (!trainerIds || !Array.isArray(trainerIds) || trainerIds.length === 0) {
            res.status(400).json({ message: "trainerIds array is required" });
            return;
        }
        // Verify trainers are part of the project
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                trainers: { select: { id: true } },
            },
        });
        const projectTrainerIds = project?.trainers.map((t) => t.id) || [];
        const invalidTrainers = trainerIds.filter((id) => !projectTrainerIds.includes(id));
        if (invalidTrainers.length > 0) {
            res.status(400).json({
                message: "Some trainers are not members of this project",
                invalidTrainers,
            });
            return;
        }
        const quiz = await prisma.quiz.update({
            where: { id: quizId, projectId },
            data: {
                creators: {
                    connect: trainerIds.map((id) => ({ id })),
                },
            },
            include: {
                creators: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
        res.status(200).json({
            message: "Creators added to quiz",
            creators: quiz.creators,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
// DELETE /api/projects/:projectId/quizzes/:quizId/creators/:trainerId
export const removeCreatorFromQuiz = async (req, res) => {
    try {
        const { projectId, quizId, trainerId } = req.params;
        if (typeof projectId !== "string") {
            res.status(400).json({ message: "Project ID is required" });
            return;
        }
        if (typeof quizId !== "string") {
            res.status(400).json({ message: "QUiz ID is required" });
            return;
        }
        if (typeof trainerId !== "string") {
            res.status(400).json({ message: "Trainer ID is required" });
            return;
        }
        await prisma.quiz.update({
            where: { id: quizId, projectId },
            data: {
                creators: {
                    disconnect: { id: trainerId },
                },
            },
        });
        res.status(200).json({ message: "Creator removed from quiz" });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
// PATCH /api/projects/:projectId/quizzes/:quizId/publish
export const toggleQuizPublish = async (req, res) => {
    try {
        const { projectId, quizId } = req.params;
        if (typeof projectId !== "string") {
            res.status(400).json({ message: "Project ID is required" });
            return;
        }
        if (typeof quizId !== "string") {
            res.status(400).json({ message: "QUiz ID is required" });
            return;
        }
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId, projectId },
        });
        if (!quiz) {
            res.status(404).json({ message: "Quiz not found" });
            return;
        }
        const updatedQuiz = await prisma.quiz.update({
            where: { id: quizId },
            data: {
                published: !quiz.published,
            },
        });
        res.status(200).json({
            message: `Quiz ${updatedQuiz.published ? "published" : "unpublished"} successfully`,
            quiz: updatedQuiz,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
//# sourceMappingURL=quiz.controller.js.map