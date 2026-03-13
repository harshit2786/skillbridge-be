import prisma from "../lib/prisma.js";
import { v4 as uuidv4 } from "uuid";
// POST /api/projects/:projectId/courses/:courseId/sections/:sectionId/questions
export const createCourseQuestion = async (req, res) => {
    try {
        const { courseId, sectionId } = req.params;
        const { type, question, points, data } = req.body;
        if (typeof courseId !== "string") {
            res.status(400).json({ message: "Course ID is required" });
            return;
        }
        if (typeof sectionId !== "string") {
            res.status(400).json({ message: "Section ID is required" });
            return;
        }
        if (!type || !question) {
            res.status(400).json({ message: "type and question are required" });
            return;
        }
        const validTypes = [
            "mcq",
            "fill_ups",
            "true_false",
            "long_answer",
            "content_block",
        ];
        if (!validTypes.includes(type)) {
            res.status(400).json({
                message: `Invalid question type. Must be one of: ${validTypes.join(", ")}`,
            });
            return;
        }
        const section = await prisma.courseSection.findUnique({
            where: { id: sectionId, courseId },
        });
        if (!section) {
            res.status(404).json({ message: "Section not found" });
            return;
        }
        const validationError = validateQuestionData(type, data);
        if (validationError) {
            res.status(400).json({ message: validationError });
            return;
        }
        const processedData = processQuestionData(type, data);
        const lastQuestion = await prisma.courseQuestion.findFirst({
            where: { sectionId },
            orderBy: { order: "desc" },
        });
        const nextOrder = lastQuestion ? lastQuestion.order + 1 : 0;
        const newQuestion = await prisma.courseQuestion.create({
            data: {
                sectionId,
                type,
                question,
                points: points || 0,
                order: nextOrder,
                data: processedData,
            },
        });
        res.status(201).json({
            message: "Question created successfully",
            question: newQuestion,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
// GET /api/projects/:projectId/courses/:courseId/sections/:sectionId/questions
export const getCourseQuestions = async (req, res) => {
    try {
        const { courseId, sectionId } = req.params;
        const role = req.role;
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
        const questions = await prisma.courseQuestion.findMany({
            where: { sectionId },
            orderBy: { order: "asc" },
        });
        // Removed as this route is now trainer-only. Instead we will be adding a separate trainee controller.
        // if (role === "trainee") {
        //   const sanitized = questions.map((q) => ({
        //     ...q,
        //     data: stripAnswers(q.type, q.data as any),
        //   }));
        //   res.status(200).json({ questions: sanitized });
        //   return;
        // }
        res.status(200).json({ questions });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
// GET /api/projects/:projectId/courses/:courseId/sections/:sectionId/questions/:questionId
export const getCourseQuestionById = async (req, res) => {
    try {
        const { sectionId, questionId } = req.params;
        const role = req.role;
        if (typeof questionId !== "string") {
            res.status(400).json({ message: "Question ID is required" });
            return;
        }
        if (typeof sectionId !== "string") {
            res.status(400).json({ message: "Section ID is required" });
            return;
        }
        const question = await prisma.courseQuestion.findUnique({
            where: { id: questionId, sectionId },
        });
        if (!question) {
            res.status(404).json({ message: "Question not found" });
            return;
        }
        // Removed as this route is now trainer-only. Instead we will be adding a separate trainee controller.
        // if (role === "trainee") {
        //   res.status(200).json({
        //     question: {
        //       ...question,
        //       data: stripAnswers(question.type, question.data as any),
        //     },
        //   });
        //   return;
        // }
        res.status(200).json({ question });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
// PATCH /api/projects/:projectId/courses/:courseId/sections/:sectionId/questions/:questionId
export const updateCourseQuestion = async (req, res) => {
    try {
        const { sectionId, questionId } = req.params;
        const { type, question, points, data } = req.body;
        if (typeof questionId !== "string") {
            res.status(400).json({ message: "Question ID is required" });
            return;
        }
        if (typeof sectionId !== "string") {
            res.status(400).json({ message: "Section ID is required" });
            return;
        }
        const existing = await prisma.courseQuestion.findUnique({
            where: { id: questionId, sectionId },
        });
        if (!existing) {
            res.status(404).json({ message: "Question not found" });
            return;
        }
        if (type) {
            const validTypes = [
                "mcq",
                "fill_ups",
                "true_false",
                "long_answer",
                "content_block",
            ];
            if (!validTypes.includes(type)) {
                res.status(400).json({
                    message: `Invalid question type. Must be one of: ${validTypes.join(", ")}`,
                });
                return;
            }
        }
        const finalType = type || existing.type;
        if (data) {
            const validationError = validateQuestionData(finalType, data);
            if (validationError) {
                res.status(400).json({ message: validationError });
                return;
            }
        }
        const processedData = data
            ? processQuestionData(finalType, data)
            : undefined;
        const updated = await prisma.courseQuestion.update({
            where: { id: questionId },
            data: {
                ...(type !== undefined && { type }),
                ...(question !== undefined && { question }),
                ...(points !== undefined && { points }),
                ...(processedData !== undefined && { data: processedData }),
            },
        });
        res.status(200).json({
            message: "Question updated successfully",
            question: updated,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
// DELETE /api/projects/:projectId/courses/:courseId/sections/:sectionId/questions/:questionId
export const deleteCourseQuestion = async (req, res) => {
    try {
        const { sectionId, questionId } = req.params;
        if (typeof questionId !== "string") {
            res.status(400).json({ message: "Question ID is required" });
            return;
        }
        if (typeof sectionId !== "string") {
            res.status(400).json({ message: "Section ID is required" });
            return;
        }
        const question = await prisma.courseQuestion.findUnique({
            where: { id: questionId, sectionId },
        });
        if (!question) {
            res.status(404).json({ message: "Question not found" });
            return;
        }
        await prisma.$transaction(async (tx) => {
            await tx.courseQuestion.delete({
                where: { id: questionId },
            });
            const remaining = await tx.courseQuestion.findMany({
                where: { sectionId },
                orderBy: { order: "asc" },
            });
            for (let i = 0; i < remaining.length; i++) {
                if (remaining[i].order !== i) {
                    await tx.courseQuestion.update({
                        where: { id: remaining[i].id },
                        data: { order: i },
                    });
                }
            }
        });
        res.status(200).json({ message: "Question deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
// PUT /api/projects/:projectId/courses/:courseId/sections/:sectionId/questions/reorder
export const reorderCourseQuestions = async (req, res) => {
    try {
        const { courseId, sectionId } = req.params;
        const { order } = req.body;
        if (typeof courseId !== "string") {
            res.status(400).json({ message: "Course ID is required" });
            return;
        }
        if (typeof sectionId !== "string") {
            res.status(400).json({ message: "Section ID is required" });
            return;
        }
        if (!order || !Array.isArray(order) || order.length === 0) {
            res.status(400).json({ message: "order array is required" });
            return;
        }
        const section = await prisma.courseSection.findUnique({
            where: { id: sectionId, courseId },
        });
        if (!section) {
            res.status(404).json({ message: "Section not found" });
            return;
        }
        const existing = await prisma.courseQuestion.findMany({
            where: { sectionId },
        });
        const existingIds = existing.map((q) => q.id);
        const orderIds = order.map((o) => o.questionId);
        const invalidIds = orderIds.filter((id) => !existingIds.includes(id));
        if (invalidIds.length > 0) {
            res.status(400).json({
                message: "Some question IDs don't belong to this section",
                invalidIds,
            });
            return;
        }
        if (orderIds.length !== existingIds.length) {
            res.status(400).json({
                message: `Expected ${existingIds.length} questions, got ${orderIds.length}. All questions must be included.`,
            });
            return;
        }
        const positions = order.map((o) => o.order);
        if (new Set(positions).size !== positions.length) {
            res.status(400).json({ message: "Duplicate positions are not allowed" });
            return;
        }
        await prisma.$transaction([
            ...order.map((item, index) => prisma.courseQuestion.update({
                where: { id: item.questionId },
                data: { order: -(index + 1) },
            })),
            ...order.map((item) => prisma.courseQuestion.update({
                where: { id: item.questionId },
                data: { order: item.order },
            })),
        ]);
        const updated = await prisma.courseQuestion.findMany({
            where: { sectionId },
            orderBy: { order: "asc" },
        });
        res.status(200).json({
            message: "Questions reordered successfully",
            questions: updated,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};
// ─── Validation ───────────────────────────────────
function validateQuestionData(type, data) {
    if (!data)
        return null;
    switch (type) {
        case "mcq": {
            if (!data.options ||
                !Array.isArray(data.options) ||
                data.options.length < 2) {
                return "MCQ requires at least 2 options in data.options";
            }
            const hasCorrect = data.options.some((o) => o.isCorrect === true);
            if (!hasCorrect) {
                return "MCQ requires at least one correct option";
            }
            for (const opt of data.options) {
                if (!opt.text || typeof opt.text !== "string") {
                    return "Each MCQ option must have a text field";
                }
                if (typeof opt.isCorrect !== "boolean") {
                    return "Each MCQ option must have an isCorrect boolean";
                }
            }
            return null;
        }
        case "fill_ups": {
            if (!data.template || typeof data.template !== "string") {
                return "fill_ups requires data.template as a string";
            }
            if (!data.blanks ||
                !Array.isArray(data.blanks) ||
                data.blanks.length === 0) {
                return "fill_ups requires data.blanks as a non-empty array";
            }
            for (const blank of data.blanks) {
                if (typeof blank.index !== "number") {
                    return "Each blank must have an index (number)";
                }
                if (!blank.answer || typeof blank.answer !== "string") {
                    return "Each blank must have an answer (string)";
                }
            }
            const templateBlanks = (data.template.match(/\*[^*]+\*/g) || []).length;
            if (templateBlanks !== data.blanks.length) {
                return `Template has ${templateBlanks} blanks (*word*) but ${data.blanks.length} blank answers provided`;
            }
            return null;
        }
        case "true_false": {
            if (data.correctAnswer === undefined ||
                typeof data.correctAnswer !== "boolean") {
                return "true_false requires data.correctAnswer to be true or false";
            }
            return null;
        }
        case "long_answer": {
            if (data.rubric) {
                if (!Array.isArray(data.rubric)) {
                    return "long_answer rubric must be an array";
                }
                let totalWeight = 0;
                for (const criterion of data.rubric) {
                    if (!criterion.title || typeof criterion.title !== "string") {
                        return "Each rubric criterion must have a title";
                    }
                    if (typeof criterion.weight !== "number" || criterion.weight < 0) {
                        return "Each rubric criterion must have a non-negative weight";
                    }
                    totalWeight += criterion.weight;
                }
                if (totalWeight !== 100) {
                    return `Rubric weights must sum to 100, got ${totalWeight}`;
                }
            }
            return null;
        }
        case "content_block": {
            if (!data.content || typeof data.content !== "string") {
                return "content_block requires data.content as a string (HTML)";
            }
            return null;
        }
        default:
            return `Unknown question type: ${type}`;
    }
}
function processQuestionData(type, data) {
    if (!data)
        return data;
    switch (type) {
        case "mcq": {
            return {
                ...data,
                shuffleOptions: data.shuffleOptions ?? true,
                options: data.options.map((opt) => ({
                    id: opt.id || uuidv4(),
                    text: opt.text,
                    isCorrect: opt.isCorrect,
                })),
            };
        }
        case "long_answer": {
            return {
                ...data,
                rubric: data.rubric?.map((criterion) => ({
                    id: criterion.id || uuidv4(),
                    title: criterion.title,
                    description: criterion.description || "",
                    weight: criterion.weight,
                })),
            };
        }
        default:
            return data;
    }
}
function stripAnswers(type, data) {
    if (!data)
        return data;
    switch (type) {
        case "mcq":
            return {
                shuffleOptions: data.shuffleOptions,
                options: data.options?.map((o) => ({
                    id: o.id,
                    text: o.text,
                })) || [],
            };
        case "fill_ups":
            return {
                template: data.template?.replace(/\*[^*]+\*/g, "*___*"),
                blanks: data.blanks?.map((b) => ({
                    index: b.index,
                })) || [],
            };
        case "true_false":
            return {};
        case "long_answer":
            return {};
        case "content_block":
            return {
                content: data.content,
                contentText: data.contentText,
            };
        default:
            return {};
    }
}
//# sourceMappingURL=courseQuestion.controller.js.map