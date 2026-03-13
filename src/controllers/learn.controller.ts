import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { addQuizGradingJob } from "../lib/queue.js";
import { openai } from "../lib/embeddings.js";

// ─── Helper: strip answers from question data for trainees ───────

function stripAnswers(type: string, data: any): any {
  if (!data) return data;

  switch (type) {
    case "mcq":
      const correctCount =
        data.options?.filter((o: any) => o.isCorrect).length ?? 0;
      return {
        shuffleOptions: data.shuffleOptions,
        correctCount, // 1 = single select, >1 = multi select
        options:
          data.options?.map((o: any) => ({
            id: o.id,
            text: o.text,
          })) || [],
      };

    case "fill_ups":
      return {
        template: data.template?.replace(/\*[^*]+\*/g, "*___*"),
        blanks:
          data.blanks?.map((b: any) => ({
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

// ─── Helper: validate course answer (deterministic types only) ───

// ─── Helper: validate course answer (synchronous types) ─────────

function validateCourseAnswer(
  type: string,
  data: any,
  answer: any,
): { correct: boolean; message: string } {
  switch (type) {
    case "mcq": {
      const correctOptionIds = (data.options || [])
        .filter((o: any) => o.isCorrect)
        .map((o: any) => o.id);

      const selectedIds: string[] = Array.isArray(answer?.selectedOptionIds)
        ? answer.selectedOptionIds
        : answer?.selectedOptionId
          ? [answer.selectedOptionId]
          : [];

      if (selectedIds.length === 0) {
        return { correct: false, message: "Please select an option" };
      }
      if (!correctOptionIds.length) {
        return {
          correct: false,
          message: "Question has no correct answer configured",
        };
      }

      const isCorrect =
        correctOptionIds.length === selectedIds.length &&
        correctOptionIds.every((id: string) => selectedIds.includes(id)) &&
        selectedIds.every((id: string) => correctOptionIds.includes(id));

      return {
        correct: isCorrect,
        message: isCorrect ? "Correct!" : "Incorrect. Try again.",
      };
    }

    case "fill_ups": {
      if (!answer?.blanks || !Array.isArray(answer.blanks)) {
        return { correct: false, message: "Please fill in all the blanks" };
      }
      const expectedBlanks: any[] = data.blanks || [];
      if (answer.blanks.length !== expectedBlanks.length) {
        return {
          correct: false,
          message: `Expected ${expectedBlanks.length} blanks`,
        };
      }

      for (const expected of expectedBlanks) {
        const submitted = answer.blanks.find(
          (b: any) => b.index === expected.index,
        );
        if (
          !submitted ||
          !submitted.answer ||
          submitted.answer.trim().toLowerCase() !==
            expected.answer.trim().toLowerCase()
        ) {
          return {
            correct: false,
            message: "One or more blanks are incorrect. Try again.",
          };
        }
      }
      return { correct: true, message: "Correct!" };
    }

    case "true_false": {
      if (answer?.answer === undefined || typeof answer.answer !== "boolean") {
        return { correct: false, message: "Please select True or False" };
      }
      const isCorrect = answer.answer === data.correctAnswer;
      return {
        correct: isCorrect,
        message: isCorrect ? "Correct!" : "Incorrect. Try again.",
      };
    }

    case "content_block": {
      return { correct: true, message: "Noted!" };
    }

    // long_answer is NOT handled here — it uses async AI validation
    default:
      return { correct: false, message: "Unknown question type" };
  }
}

// ─── Helper: AI-validate long answer for courses ─────────────────

async function validateCourseLongAnswer(
  questionText: string,
  data: any,
  answer: any,
): Promise<{ correct: boolean; message: string }> {
  const rubric: any[] = data.rubric || [];
  const goldenSolution: string = data.goldenSolution || "";
  const traineeAnswer: string = answer?.answer || "";

  if (!traineeAnswer.trim()) {
    return { correct: false, message: "Please provide an answer" };
  }

  if (rubric.length === 0) {
    // No rubric configured — auto-accept
    return { correct: true, message: "Answer accepted!" };
  }

  const rubricDescription = rubric
    .map(
      (r: any, i: number) =>
        `${i + 1}. "${r.title}" (weight: ${r.weight}%): ${r.description || "No description"}`,
    )
    .join("\n");

  const prompt = `You are a strict but fair exam grader for a learning course. The student must meet ALL rubric criteria to pass.

**Question:** ${questionText}

**Golden/Model Solution:** ${goldenSolution || "Not provided"}

**Rubric Criteria:**
${rubricDescription}

**Student's Answer:** ${traineeAnswer}

**Instructions:**
- For each rubric criterion, determine if the criterion is FULLY met.
- ALL criteria must be met for the answer to be accepted.
- Respond with valid JSON only, no markdown, no explanation outside the JSON.

**Response format:**
{
  "criteria": [
    {
      "title": "criterion title",
      "met": true/false,
      "reasoning": "brief explanation"
    }
  ],
  "allMet": true/false,
  "feedback": "1-2 sentence constructive feedback for the student. If not all criteria met, explain what's missing and how to improve."
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const result = JSON.parse(content);

    if (result.allMet) {
      return {
        correct: true,
        message: result.feedback || "All rubric criteria met. Correct!",
      };
    }

    // Build detailed feedback showing which criteria failed
    const failedCriteria = (result.criteria || [])
      .filter((c: any) => !c.met)
      .map((c: any) => `• ${c.title}: ${c.reasoning}`)
      .join("\n");

    const message = result.feedback
      ? `${result.feedback}\n\nCriteria not met:\n${failedCriteria}`
      : `Some rubric criteria were not met. Try again.\n\n${failedCriteria}`;

    return {
      correct: false,
      message,
    };
  } catch (error) {
    console.error("OpenAI course validation error:", error);
    // On AI failure, give a generic error and let them retry
    return {
      correct: false,
      message: "Could not validate your answer right now. Please try again.",
    };
  }
}

// ─── Helper: Check if content is unlocked for trainee ────────────

async function isContentUnlocked(
  traineeProgress: { id: string; currentContentId: string | null },
  itemId: string,
  type: "QUIZ" | "COURSE",
  projectId: string,
): Promise<boolean> {
  if (!traineeProgress.currentContentId) return false;

  const contents = await prisma.projectContent.findMany({
    where: { projectId },
    include: {
      quiz: { select: { id: true, published: true } },
      course: { select: { id: true, published: true } },
    },
    orderBy: { position: "asc" },
  });

  const publishedContents = contents.filter((c) => {
    if (c.type === "QUIZ") return c.quiz?.published;
    if (c.type === "COURSE") return c.course?.published;
    return false;
  });

  const currentContent = publishedContents.find(
    (c) => c.id === traineeProgress.currentContentId,
  );

  if (!currentContent) return false;

  const targetContent = publishedContents.find((c) => {
    if (type === "QUIZ") return c.quizId === itemId;
    if (type === "COURSE") return c.courseId === itemId;
    return false;
  });

  if (!targetContent) return false;

  return targetContent.position <= currentContent.position;
}

// ─── Helper: Advance to next published content ──────────────────

async function advanceToNextContent(
  traineeProgressId: string,
  currentContentId: string,
  projectId: string,
): Promise<void> {
  const contents = await prisma.projectContent.findMany({
    where: { projectId },
    include: {
      quiz: { select: { id: true, published: true } },
      course: { select: { id: true, published: true } },
    },
    orderBy: { position: "asc" },
  });

  const publishedContents = contents.filter((c) => {
    if (c.type === "QUIZ") return c.quiz?.published;
    if (c.type === "COURSE") return c.course?.published;
    return false;
  });

  const currentIndex = publishedContents.findIndex(
    (c) => c.id === currentContentId,
  );

  if (currentIndex === -1) return;

  const nextContent = publishedContents[currentIndex + 1];

  if (nextContent) {
    await prisma.traineeProgress.update({
      where: { id: traineeProgressId },
      data: { currentContentId: nextContent.id },
    });
  }
}

// ═════════════════════════════════════════════════════════════════
// ─── GET /learn/progress ─────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════

export const getProgress = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const traineeId = req.userId!;

    if (typeof projectId !== "string") {
      res.status(400).json({ message: "Project ID is required" });
      return;
    }

    // Verify trainee is member of project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        trainees: { select: { id: true } },
      },
    });

    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    if (!project.trainees.some((t) => t.id === traineeId)) {
      res.status(403).json({ message: "You are not a member of this project" });
      return;
    }

    // Get ordered published content for sidebar
    const contents = await prisma.projectContent.findMany({
      where: { projectId },
      include: {
        quiz: {
          select: {
            id: true,
            name: true,
            description: true,
            published: true,
            passingPercent: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
            description: true,
            published: true,
          },
        },
      },
      orderBy: { position: "asc" },
    });

    const publishedContents = contents.filter((c) => {
      if (c.type === "QUIZ") return c.quiz?.published;
      if (c.type === "COURSE") return c.course?.published;
      return false;
    });

    // Get existing progress
    const progress = await prisma.traineeProgress.findUnique({
      where: {
        traineeId_projectId: { traineeId, projectId },
      },
      include: {
        currentContent: true,
        courseProgresses: {
          select: {
            courseId: true,
            status: true,
            currentSectionOrder: true,
          },
        },
        quizAttempts: {
          select: {
            quizId: true,
            status: true,
            currentSectionOrder: true,
            totalScore: true,
            maxScore: true,
            passed: true,
          },
        },
      },
    });

    // Build sidebar items with status
    const sidebarItems = publishedContents.map((content) => {
      let status:
        | "locked"
        | "available"
        | "in_progress"
        | "completed"
        | "grading" = "locked";
      let extraData: any = {};

      if (progress) {
        if (content.type === "COURSE" && content.courseId) {
          const cp = progress.courseProgresses.find(
            (p) => p.courseId === content.courseId,
          );
          if (cp) {
            status = cp.status === "COMPLETED" ? "completed" : "in_progress";
            extraData.currentSectionOrder = cp.currentSectionOrder;
          }
        } else if (content.type === "QUIZ" && content.quizId) {
          const qa = progress.quizAttempts.find(
            (a) => a.quizId === content.quizId,
          );
          if (qa) {
            if (qa.status === "IN_PROGRESS") {
              status = "in_progress";
            } else if (qa.status === "SUBMITTED") {
              status = "grading";
            } else {
              // GRADED
              status = "completed";
            }
            extraData.totalScore = qa.totalScore;
            extraData.maxScore = qa.maxScore;
            extraData.passed = qa.passed;
          }
        }

        // If no progress record exists, check if it's the current or past content
        if (status === "locked" && progress.currentContentId) {
          const currentPos = publishedContents.find(
            (c) => c.id === progress.currentContentId,
          )?.position;
          if (currentPos !== undefined) {
            if (content.position < currentPos) {
              // Before current — should have some record, but if not, treat as available
              status = "available";
            } else if (content.id === progress.currentContentId) {
              status = "available";
            }
          }
        }
      }

      return {
        contentId: content.id,
        position: content.position,
        type: content.type,
        quiz: content.quiz,
        course: content.course,
        status,
        ...extraData,
      };
    });

    res.status(200).json({
      progress: progress
        ? {
            id: progress.id,
            currentContentId: progress.currentContentId,
            startedAt: progress.startedAt,
          }
        : null,
      contents: sidebarItems,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ═════════════════════════════════════════════════════════════════
// ─── POST /learn/start ───────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════

export const startLearning = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const traineeId = req.userId!;

    if (typeof projectId !== "string") {
      res.status(400).json({ message: "Project ID is required" });
      return;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        trainees: { select: { id: true } },
      },
    });

    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    if (!project.trainees.some((t) => t.id === traineeId)) {
      res.status(403).json({ message: "You are not a member of this project" });
      return;
    }

    // Check if already started
    const existing = await prisma.traineeProgress.findUnique({
      where: { traineeId_projectId: { traineeId, projectId } },
    });

    if (existing) {
      res.status(200).json({
        message: "Learning already started",
        progress: existing,
      });
      return;
    }

    // Get first published content
    const contents = await prisma.projectContent.findMany({
      where: { projectId },
      include: {
        quiz: { select: { id: true, published: true } },
        course: { select: { id: true, published: true } },
      },
      orderBy: { position: "asc" },
    });

    const firstPublished = contents.find((c) => {
      if (c.type === "QUIZ") return c.quiz?.published;
      if (c.type === "COURSE") return c.course?.published;
      return false;
    });

    if (!firstPublished) {
      res.status(400).json({
        message: "No published content available in this project",
      });
      return;
    }

    const progress = await prisma.traineeProgress.create({
      data: {
        traineeId,
        projectId,
        currentContentId: firstPublished.id,
      },
    });

    res.status(201).json({
      message: "Learning started",
      progress,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ═════════════════════════════════════════════════════════════════
// ─── COURSE FLOW ─────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════

// GET /learn/courses/:courseId
export const getCourseProgress = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId, courseId } = req.params;
    const traineeId = req.userId!;

    if (typeof projectId !== "string" || typeof courseId !== "string") {
      res
        .status(400)
        .json({ message: "Project ID and Course ID are required" });
      return;
    }

    const traineeProgress = await prisma.traineeProgress.findUnique({
      where: { traineeId_projectId: { traineeId, projectId } },
    });

    if (!traineeProgress) {
      res.status(400).json({ message: "Please start learning first" });
      return;
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId, projectId, published: true },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: {
            _count: { select: { questions: true } },
          },
        },
      },
    });

    if (!course) {
      res.status(404).json({ message: "Course not found or not published" });
      return;
    }

    const contentUnlocked = await isContentUnlocked(
      traineeProgress,
      courseId,
      "COURSE",
      projectId,
    );
    if (!contentUnlocked) {
      res.status(403).json({ message: "This course is not yet unlocked" });
      return;
    }

    // Get or create course progress
    let courseProgress = await prisma.courseProgress.findUnique({
      where: {
        traineeProgressId_courseId: {
          traineeProgressId: traineeProgress.id,
          courseId,
        },
      },
      include: {
        completions: {
          select: { courseQuestionId: true },
        },
      },
    });

    if (!courseProgress) {
      courseProgress = await prisma.courseProgress.create({
        data: {
          traineeProgressId: traineeProgress.id,
          courseId,
        },
        include: {
          completions: {
            select: { courseQuestionId: true },
          },
        },
      });
    }

    const sections = course.sections.map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      order: section.order,
      totalQuestions: section._count.questions,
      isUnlocked: section.order <= courseProgress!.currentSectionOrder,
      isCurrent: section.order === courseProgress!.currentSectionOrder,
    }));

    res.status(200).json({
      course: {
        id: course.id,
        name: course.name,
        description: course.description,
      },
      progress: {
        id: courseProgress.id,
        status: courseProgress.status,
        currentSectionOrder: courseProgress.currentSectionOrder,
        startedAt: courseProgress.startedAt,
        completedAt: courseProgress.completedAt,
      },
      sections,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET /learn/courses/:courseId/sections/:sectionId/questions
export const getCourseSectionQuestions = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId, courseId, sectionId } = req.params;
    const traineeId = req.userId!;

    if (
      typeof projectId !== "string" ||
      typeof courseId !== "string" ||
      typeof sectionId !== "string"
    ) {
      res.status(400).json({
        message: "Project ID, Course ID, and Section ID are required",
      });
      return;
    }

    const traineeProgress = await prisma.traineeProgress.findUnique({
      where: { traineeId_projectId: { traineeId, projectId } },
    });

    if (!traineeProgress) {
      res.status(400).json({ message: "Please start learning first" });
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

    const courseProgress = await prisma.courseProgress.findUnique({
      where: {
        traineeProgressId_courseId: {
          traineeProgressId: traineeProgress.id,
          courseId,
        },
      },
      include: {
        completions: {
          select: { courseQuestionId: true },
        },
      },
    });

    if (!courseProgress) {
      res.status(400).json({ message: "Course not started" });
      return;
    }

    if (section.order > courseProgress.currentSectionOrder) {
      res.status(403).json({ message: "This section is not yet unlocked" });
      return;
    }

    const completedQuestionIds = new Set(
      courseProgress.completions.map((c) => c.courseQuestionId),
    );

    const questions = section.questions.map((q) => ({
      id: q.id,
      type: q.type,
      question: q.question,
      order: q.order,
      data: stripAnswers(q.type, q.data as any),
      completed: completedQuestionIds.has(q.id),
    }));
    const answerableQuestions = section.questions.filter(
      (q) => q.type !== "content_block",
    );

    const sectionAutoComplete = answerableQuestions.length === 0;
    res.status(200).json({
      section: {
        id: section.id,
        title: section.title,
        description: section.description,
        order: section.order,
      },
      questions,
      sectionAutoComplete,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST /learn/courses/:courseId/sections/:sectionId/questions/:questionId/submit
export const submitCourseAnswer = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId, courseId, sectionId, questionId } = req.params;
    const { answer } = req.body;
    const traineeId = req.userId!;

    if (
      typeof projectId !== "string" ||
      typeof courseId !== "string" ||
      typeof sectionId !== "string" ||
      typeof questionId !== "string"
    ) {
      res.status(400).json({ message: "All IDs are required" });
      return;
    }

    const traineeProgress = await prisma.traineeProgress.findUnique({
      where: { traineeId_projectId: { traineeId, projectId } },
    });

    if (!traineeProgress) {
      res.status(400).json({ message: "Please start learning first" });
      return;
    }

    const courseProgress = await prisma.courseProgress.findUnique({
      where: {
        traineeProgressId_courseId: {
          traineeProgressId: traineeProgress.id,
          courseId,
        },
      },
    });

    if (!courseProgress) {
      res.status(400).json({ message: "Course not started" });
      return;
    }

    if (courseProgress.status === "COMPLETED") {
      res.status(400).json({ message: "Course already completed" });
      return;
    }

    const section = await prisma.courseSection.findUnique({
      where: { id: sectionId, courseId },
    });

    if (!section) {
      res.status(404).json({ message: "Section not found" });
      return;
    }

    if (section.order > courseProgress.currentSectionOrder) {
      res.status(403).json({ message: "This section is not yet unlocked" });
      return;
    }

    const question = await prisma.courseQuestion.findUnique({
      where: { id: questionId, sectionId },
    });

    if (!question) {
      res.status(404).json({ message: "Question not found" });
      return;
    }
    if (question.type === "content_block") {
      res.status(200).json({
        correct: true,
        message: "Content block — no submission needed",
        sectionCompleted: false,
        courseCompleted: false,
      });
      return;
    }
    // Check if already completed
    const existingCompletion = await prisma.courseQuestionCompletion.findUnique(
      {
        where: {
          courseProgressId_courseQuestionId: {
            courseProgressId: courseProgress.id,
            courseQuestionId: questionId,
          },
        },
      },
    );

    if (existingCompletion) {
      res
        .status(400)
        .json({ message: "Question already completed", completed: true });
      return;
    }

    // Validate the answer
    let result: { correct: boolean; message: string };

    if (question.type === "long_answer") {
      result = await validateCourseLongAnswer(
        question.question,
        question.data as any,
        answer,
      );
    } else {
      result = validateCourseAnswer(
        question.type,
        question.data as any,
        answer,
      );
    }

    if (!result.correct) {
      res.status(200).json({
        correct: false,
        message: result.message,
      });
      return;
    }

    // Record completion
    await prisma.courseQuestionCompletion.create({
      data: {
        courseProgressId: courseProgress.id,
        courseQuestionId: questionId,
      },
    });

    // Check if all questions in section are completed
    const totalQuestionsInSection = await prisma.courseQuestion.count({
      where: {
        sectionId,
        type: { not: "content_block" },
      },
    });

    const completedInSection = await prisma.courseQuestionCompletion.count({
      where: {
        courseProgressId: courseProgress.id,
        courseQuestion: { sectionId },
      },
    });

    const sectionCompleted = completedInSection >= totalQuestionsInSection;

    if (sectionCompleted) {
      const totalSections = await prisma.courseSection.count({
        where: { courseId },
      });

      const isLastSection = section.order === totalSections - 1;

      if (isLastSection) {
        // Course completed
        await prisma.courseProgress.update({
          where: { id: courseProgress.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });

        // Advance to next project content
        await advanceToNextContent(
          traineeProgress.id,
          traineeProgress.currentContentId!,
          projectId,
        );

        res.status(200).json({
          correct: true,
          message: result.message,
          sectionCompleted: true,
          courseCompleted: true,
        });
        return;
      } else {
        await prisma.courseProgress.update({
          where: { id: courseProgress.id },
          data: {
            currentSectionOrder: section.order + 1,
          },
        });

        res.status(200).json({
          correct: true,
          message: result.message,
          sectionCompleted: true,
          courseCompleted: false,
          nextSectionOrder: section.order + 1,
        });
        return;
      }
    }

    res.status(200).json({
      correct: true,
      message: result.message,
      sectionCompleted: false,
      courseCompleted: false,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ═════════════════════════════════════════════════════════════════
// ─── QUIZ FLOW ───────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════

// GET /learn/quizzes/:quizId
export const getQuizProgress = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId, quizId } = req.params;
    const traineeId = req.userId!;

    if (typeof projectId !== "string" || typeof quizId !== "string") {
      res.status(400).json({ message: "Project ID and Quiz ID are required" });
      return;
    }

    const traineeProgress = await prisma.traineeProgress.findUnique({
      where: { traineeId_projectId: { traineeId, projectId } },
    });

    if (!traineeProgress) {
      res.status(400).json({ message: "Please start learning first" });
      return;
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId, projectId, published: true },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: {
            _count: { select: { questions: true } },
          },
        },
      },
    });

    if (!quiz) {
      res.status(404).json({ message: "Quiz not found or not published" });
      return;
    }

    const contentUnlocked = await isContentUnlocked(
      traineeProgress,
      quizId,
      "QUIZ",
      projectId,
    );
    if (!contentUnlocked) {
      res.status(403).json({ message: "This quiz is not yet unlocked" });
      return;
    }

    // Get or create quiz attempt
    let quizAttempt = await prisma.quizAttempt.findUnique({
      where: {
        traineeProgressId_quizId: {
          traineeProgressId: traineeProgress.id,
          quizId,
        },
      },
      include: {
        responses: {
          select: { questionId: true, submitted: true },
        },
      },
    });

    if (!quizAttempt) {
      quizAttempt = await prisma.quizAttempt.create({
        data: {
          traineeProgressId: traineeProgress.id,
          quizId,
        },
        include: {
          responses: {
            select: { questionId: true, submitted: true },
          },
        },
      });
    }

    const sections = quiz.sections.map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      order: section.order,
      totalQuestions: section._count.questions,
      isUnlocked: section.order <= quizAttempt!.currentSectionOrder,
      isCurrent: section.order === quizAttempt!.currentSectionOrder,
    }));

    res.status(200).json({
      quiz: {
        id: quiz.id,
        name: quiz.name,
        description: quiz.description,
        passingPercent: quiz.passingPercent,
      },
      attempt: {
        id: quizAttempt.id,
        status: quizAttempt.status,
        currentSectionOrder: quizAttempt.currentSectionOrder,
        totalScore: quizAttempt.totalScore,
        maxScore: quizAttempt.maxScore,
        passed: quizAttempt.passed,
        startedAt: quizAttempt.startedAt,
        submittedAt: quizAttempt.submittedAt,
      },
      sections,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET /learn/quizzes/:quizId/sections/:sectionId/questions
export const getQuizSectionQuestions = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId, quizId, sectionId } = req.params;
    const traineeId = req.userId!;

    if (
      typeof projectId !== "string" ||
      typeof quizId !== "string" ||
      typeof sectionId !== "string"
    ) {
      res.status(400).json({
        message: "Project ID, Quiz ID, and Section ID are required",
      });
      return;
    }

    const traineeProgress = await prisma.traineeProgress.findUnique({
      where: { traineeId_projectId: { traineeId, projectId } },
    });

    if (!traineeProgress) {
      res.status(400).json({ message: "Please start learning first" });
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

    const quizAttempt = await prisma.quizAttempt.findUnique({
      where: {
        traineeProgressId_quizId: {
          traineeProgressId: traineeProgress.id,
          quizId,
        },
      },
      include: {
        responses: {
          select: {
            questionId: true,
            submitted: true,
            response: true,
          },
        },
      },
    });

    if (!quizAttempt) {
      res.status(400).json({ message: "Quiz not started" });
      return;
    }

    if (section.order > quizAttempt.currentSectionOrder) {
      res.status(403).json({ message: "This section is not yet unlocked" });
      return;
    }

    const responseMap = new Map(
      quizAttempt.responses.map((r) => [r.questionId, r]),
    );

    const questions = section.questions.map((q) => {
      const response = responseMap.get(q.id);
      return {
        id: q.id,
        type: q.type,
        question: q.question,
        points: q.points,
        order: q.order,
        data: stripAnswers(q.type, q.data as any),
        submitted: response?.submitted ?? false,
        submittedResponse: response?.submitted ? response.response : null,
      };
    });
    // Check if section has only content blocks (auto-complete)
    const answerableQuestions = section.questions.filter(
      (q) => q.type !== "content_block",
    );

    const sectionAutoComplete = answerableQuestions.length === 0;
    res.status(200).json({
      section: {
        id: section.id,
        title: section.title,
        description: section.description,
        order: section.order,
      },
      questions,
      attemptStatus: quizAttempt.status,
      sectionAutoComplete,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST /learn/quizzes/:quizId/sections/:sectionId/questions/:questionId/submit
export const submitQuizResponse = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId, quizId, sectionId, questionId } = req.params;
    const { answer } = req.body;
    const traineeId = req.userId!;

    if (
      typeof projectId !== "string" ||
      typeof quizId !== "string" ||
      typeof sectionId !== "string" ||
      typeof questionId !== "string"
    ) {
      res.status(400).json({ message: "All IDs are required" });
      return;
    }

    if (answer === undefined || answer === null) {
      res.status(400).json({ message: "Answer is required" });
      return;
    }

    const traineeProgress = await prisma.traineeProgress.findUnique({
      where: { traineeId_projectId: { traineeId, projectId } },
    });

    if (!traineeProgress) {
      res.status(400).json({ message: "Please start learning first" });
      return;
    }

    const quizAttempt = await prisma.quizAttempt.findUnique({
      where: {
        traineeProgressId_quizId: {
          traineeProgressId: traineeProgress.id,
          quizId,
        },
      },
    });

    if (!quizAttempt) {
      res.status(400).json({ message: "Quiz not started" });
      return;
    }

    if (quizAttempt.status !== "IN_PROGRESS") {
      res.status(400).json({ message: "Quiz already submitted" });
      return;
    }

    const section = await prisma.quizSection.findUnique({
      where: { id: sectionId, quizId },
    });

    if (!section) {
      res.status(404).json({ message: "Section not found" });
      return;
    }

    if (section.order > quizAttempt.currentSectionOrder) {
      res.status(403).json({ message: "This section is not yet unlocked" });
      return;
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId, sectionId },
    });

    if (!question) {
      res.status(404).json({ message: "Question not found" });
      return;
    }
    if (question.type === "content_block") {
      res.status(200).json({
        message: "Content block — no submission needed",
        sectionCompleted: false,
        isLastSection: false,
      });
      return;
    }
    // Check if already submitted
    const existingResponse = await prisma.quizQuestionResponse.findUnique({
      where: {
        quizAttemptId_questionId: {
          quizAttemptId: quizAttempt.id,
          questionId,
        },
      },
    });

    if (existingResponse?.submitted) {
      res
        .status(400)
        .json({ message: "Response already submitted and locked" });
      return;
    }

    // Store response without validation
    await prisma.quizQuestionResponse.upsert({
      where: {
        quizAttemptId_questionId: {
          quizAttemptId: quizAttempt.id,
          questionId,
        },
      },
      create: {
        quizAttemptId: quizAttempt.id,
        questionId,
        response: answer,
        submitted: true,
        maxPoints: question.points,
      },
      update: {
        response: answer,
        submitted: true,
      },
    });

    // Check if all questions in section are submitted
    const totalQuestionsInSection = await prisma.question.count({
      where: {
        sectionId,
        type: { not: "content_block" },
      },
    });

    const submittedInSection = await prisma.quizQuestionResponse.count({
      where: {
        quizAttemptId: quizAttempt.id,
        submitted: true,
        question: { sectionId },
      },
    });

    const sectionCompleted = submittedInSection >= totalQuestionsInSection;

    if (sectionCompleted) {
      const totalSections = await prisma.quizSection.count({
        where: { quizId },
      });

      const isLastSection = section.order === totalSections - 1;

      if (!isLastSection) {
        await prisma.quizAttempt.update({
          where: { id: quizAttempt.id },
          data: {
            currentSectionOrder: section.order + 1,
          },
        });
      }

      res.status(200).json({
        message: "Your response has been submitted",
        sectionCompleted: true,
        isLastSection,
      });
      return;
    }

    res.status(200).json({
      message: "Your response has been submitted",
      sectionCompleted: false,
      isLastSection: false,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ═════════════════════════════════════════════════════════════════
// ─── POST /learn/quizzes/:quizId/complete ────────────────────────
// Enqueues the quiz for async grading
// ═════════════════════════════════════════════════════════════════

export const completeQuiz = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId, quizId } = req.params;
    const traineeId = req.userId!;

    if (typeof projectId !== "string" || typeof quizId !== "string") {
      res.status(400).json({ message: "Project ID and Quiz ID are required" });
      return;
    }

    const traineeProgress = await prisma.traineeProgress.findUnique({
      where: { traineeId_projectId: { traineeId, projectId } },
    });

    if (!traineeProgress) {
      res.status(400).json({ message: "Please start learning first" });
      return;
    }

    const quizAttempt = await prisma.quizAttempt.findUnique({
      where: {
        traineeProgressId_quizId: {
          traineeProgressId: traineeProgress.id,
          quizId,
        },
      },
    });

    if (!quizAttempt) {
      res.status(400).json({ message: "Quiz not started" });
      return;
    }

    if (quizAttempt.status !== "IN_PROGRESS") {
      res.status(400).json({
        message:
          quizAttempt.status === "SUBMITTED"
            ? "Quiz is being graded"
            : "Quiz already graded",
      });
      return;
    }

    // Verify all questions have been submitted
    const totalQuestions = await prisma.question.count({
      where: {
        section: { quizId },
        type: { not: "content_block" },
      },
    });

    const submittedCount = await prisma.quizQuestionResponse.count({
      where: {
        quizAttemptId: quizAttempt.id,
        submitted: true,
      },
    });

    if (submittedCount < totalQuestions) {
      res.status(400).json({
        message: `Please answer all questions. ${submittedCount}/${totalQuestions} submitted.`,
      });
      return;
    }

    // Mark as SUBMITTED
    await prisma.quizAttempt.update({
      where: { id: quizAttempt.id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
    });

    // Enqueue grading job
    await addQuizGradingJob({
      quizAttemptId: quizAttempt.id,
      quizId,
      traineeProgressId: traineeProgress.id,
      projectId,
    });

    res.status(200).json({
      message:
        "Quiz submitted successfully. Your results will be available shortly.",
      status: "SUBMITTED",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ═════════════════════════════════════════════════════════════════
// ─── GET /learn/quizzes/:quizId/result ───────────────────────────
// Returns graded result (only if graded)
// ═════════════════════════════════════════════════════════════════

export const getQuizResult = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId, quizId } = req.params;
    const traineeId = req.userId!;

    if (typeof projectId !== "string" || typeof quizId !== "string") {
      res.status(400).json({ message: "Project ID and Quiz ID are required" });
      return;
    }

    const traineeProgress = await prisma.traineeProgress.findUnique({
      where: { traineeId_projectId: { traineeId, projectId } },
    });

    if (!traineeProgress) {
      res.status(400).json({ message: "Please start learning first" });
      return;
    }

    const quizAttempt = await prisma.quizAttempt.findUnique({
      where: {
        traineeProgressId_quizId: {
          traineeProgressId: traineeProgress.id,
          quizId,
        },
      },
      include: {
        quiz: {
          select: {
            name: true,
            passingPercent: true,
          },
        },
        responses: {
          include: {
            question: {
              select: {
                id: true,
                question: true,
                type: true,
                points: true,
                order: true,
                section: {
                  select: {
                    id: true,
                    title: true,
                    order: true,
                  },
                },
              },
            },
          },
          orderBy: {
            question: { order: "asc" },
          },
        },
      },
    });

    if (!quizAttempt) {
      res.status(400).json({ message: "Quiz not started" });
      return;
    }

    if (quizAttempt.status === "IN_PROGRESS") {
      res.status(400).json({ message: "Quiz not yet submitted" });
      return;
    }

    if (quizAttempt.status === "SUBMITTED") {
      res.status(200).json({
        message: "Quiz is being graded. Please check back later.",
        status: "SUBMITTED",
      });
      return;
    }

    // GRADED — return full results
    const responses = quizAttempt.responses.map((r) => ({
      questionId: r.question.id,
      question: r.question.question,
      type: r.question.type,
      maxPoints: r.question.points,
      pointsAwarded: r.pointsAwarded,
      feedback: r.feedback,
      gradingStatus: r.gradingStatus,
      response: r.response,
      section: r.question.section,
    }));

    res.status(200).json({
      status: "GRADED",
      quiz: quizAttempt.quiz,
      result: {
        totalScore: quizAttempt.totalScore,
        maxScore: quizAttempt.maxScore,
        scorePercent:
          quizAttempt.maxScore && quizAttempt.maxScore > 0
            ? Math.round(
                ((quizAttempt.totalScore || 0) / quizAttempt.maxScore) * 10000,
              ) / 100
            : 0,
        passed: quizAttempt.passed,
        feedback: quizAttempt.feedback,
      },
      responses,
      submittedAt: quizAttempt.submittedAt,
      gradedAt: quizAttempt.gradedAt,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Add to learn.controller.ts

// GET /learn/content/:contentId
// Returns the content details + course/quiz progress based on projectContentId
export const getContentDetails = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { projectId, contentId } = req.params;
    const traineeId = req.userId!;

    if (typeof projectId !== "string" || typeof contentId !== "string") {
      res
        .status(400)
        .json({ message: "Project ID and Content ID are required" });
      return;
    }

    const traineeProgress = await prisma.traineeProgress.findUnique({
      where: { traineeId_projectId: { traineeId, projectId } },
    });

    if (!traineeProgress) {
      res.status(400).json({ message: "Please start learning first" });
      return;
    }

    const content = await prisma.projectContent.findUnique({
      where: { id: contentId, projectId },
      include: {
        quiz: {
          select: {
            id: true,
            name: true,
            description: true,
            published: true,
            passingPercent: true,
            sections: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
                description: true,
                order: true,
                _count: { select: { questions: true } },
              },
            },
          },
        },
        course: {
          select: {
            id: true,
            name: true,
            description: true,
            published: true,
            sections: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
                description: true,
                order: true,
                _count: { select: { questions: true } },
              },
            },
          },
        },
      },
    });

    if (!content) {
      res.status(404).json({ message: "Content not found" });
      return;
    }

    // Check if unlocked
    const isUnlocked = await isContentUnlocked(
      traineeProgress,
      content.type === "QUIZ" ? content.quizId! : content.courseId!,
      content.type as "QUIZ" | "COURSE",
      projectId,
    );

    if (!isUnlocked) {
      res.status(403).json({ message: "This content is not yet unlocked" });
      return;
    }

    // Get progress for this specific content
    let progressData: any = null;

    if (content.type === "COURSE" && content.courseId) {
      const courseProgress = await prisma.courseProgress.findUnique({
        where: {
          traineeProgressId_courseId: {
            traineeProgressId: traineeProgress.id,
            courseId: content.courseId,
          },
        },
        include: {
          completions: {
            select: { courseQuestionId: true },
          },
        },
      });

      progressData = courseProgress
        ? {
            id: courseProgress.id,
            status: courseProgress.status,
            currentSectionOrder: courseProgress.currentSectionOrder,
            startedAt: courseProgress.startedAt,
            completedAt: courseProgress.completedAt,
            completedQuestionIds: courseProgress.completions.map(
              (c) => c.courseQuestionId,
            ),
          }
        : null;
    } else if (content.type === "QUIZ" && content.quizId) {
      const quizAttempt = await prisma.quizAttempt.findUnique({
        where: {
          traineeProgressId_quizId: {
            traineeProgressId: traineeProgress.id,
            quizId: content.quizId,
          },
        },
        include: {
          responses: {
            select: { questionId: true, submitted: true },
          },
        },
      });

      progressData = quizAttempt
        ? {
            id: quizAttempt.id,
            status: quizAttempt.status,
            currentSectionOrder: quizAttempt.currentSectionOrder,
            totalScore: quizAttempt.totalScore,
            maxScore: quizAttempt.maxScore,
            passed: quizAttempt.passed,
            startedAt: quizAttempt.startedAt,
            submittedAt: quizAttempt.submittedAt,
            submittedQuestionIds: quizAttempt.responses
              .filter((r) => r.submitted)
              .map((r) => r.questionId),
          }
        : null;
    }

    res.status(200).json({
      content: {
        id: content.id,
        type: content.type,
        position: content.position,
        quiz: content.quiz,
        course: content.course,
      },
      progress: progressData,
      started: progressData !== null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST /learn/courses/:courseId/sections/:sectionId/complete
// Explicitly marks a section as complete (handles content-block-only sections)

export const completeCourseSection = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { projectId, courseId, sectionId } = req.params;
    const traineeId = req.userId!;

    if (
      typeof projectId !== "string" ||
      typeof courseId !== "string" ||
      typeof sectionId !== "string"
    ) {
      res.status(400).json({ message: "All IDs are required" });
      return;
    }

    const traineeProgress = await prisma.traineeProgress.findUnique({
      where: { traineeId_projectId: { traineeId, projectId } },
    });

    if (!traineeProgress) {
      res.status(400).json({ message: "Please start learning first" });
      return;
    }

    const courseProgress = await prisma.courseProgress.findUnique({
      where: {
        traineeProgressId_courseId: {
          traineeProgressId: traineeProgress.id,
          courseId,
        },
      },
    });

    if (!courseProgress) {
      res.status(400).json({ message: "Course not started" });
      return;
    }

    if (courseProgress.status === "COMPLETED") {
      res.status(200).json({
        message: "Course already completed",
        courseCompleted: true,
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

    if (section.order > courseProgress.currentSectionOrder) {
      res.status(403).json({ message: "This section is not yet unlocked" });
      return;
    }

    // Check if all answerable questions in this section are completed
    const answerableCount = await prisma.courseQuestion.count({
      where: {
        sectionId,
        type: { not: "content_block" },
      },
    });

    const completedCount = await prisma.courseQuestionCompletion.count({
      where: {
        courseProgressId: courseProgress.id,
        courseQuestion: { sectionId },
      },
    });

    if (answerableCount > 0 && completedCount < answerableCount) {
      res.status(400).json({
        message: `Not all questions completed. ${completedCount}/${answerableCount} done.`,
      });
      return;
    }

    // Section is complete — check if we need to advance
    const totalSections = await prisma.courseSection.count({
      where: { courseId },
    });

    const isLastSection = section.order === totalSections - 1;

    if (isLastSection) {
      // Course completed
      await prisma.courseProgress.update({
        where: { id: courseProgress.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      // Advance to next project content
      if (traineeProgress.currentContentId) {
        await advanceToNextContent(
          traineeProgress.id,
          traineeProgress.currentContentId,
          projectId
        );
      }

      res.status(200).json({
        message: "Course completed!",
        sectionCompleted: true,
        courseCompleted: true,
      });
      return;
    }

    // Not last section — advance to next section if we're on this one
    if (section.order === courseProgress.currentSectionOrder) {
      await prisma.courseProgress.update({
        where: { id: courseProgress.id },
        data: {
          currentSectionOrder: section.order + 1,
        },
      });
    }

    res.status(200).json({
      message: "Section completed!",
      sectionCompleted: true,
      courseCompleted: false,
      nextSectionOrder: section.order + 1,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};