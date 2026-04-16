import "dotenv/config";
import { Worker, Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import { redisConnection } from "../lib/queue.js";
import type { QuizGradingJobData } from "../lib/queue.js";

const prisma = new PrismaClient();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ─── Grade a single question ─────────────────────────────────────

async function gradeQuestion(
  questionType: string,
  questionText: string,
  questionData: any,
  questionPoints: number,
  response: any,
): Promise<{
  pointsAwarded: number;
  feedback: string | null;
  gradingStatus: "AUTO_GRADED" | "AI_GRADED";
}> {
  switch (questionType) {
    case "mcq": {
      const correctOptionIds = (questionData.options || [])
        .filter((o: any) => o.isCorrect)
        .map((o: any) => o.id);

      const selectedIds: string[] = Array.isArray(response?.selectedOptionIds)
        ? response.selectedOptionIds
        : response?.selectedOptionId
          ? [response.selectedOptionId]
          : [];

      // Must select exactly the correct options
      const isCorrect =
        correctOptionIds.length === selectedIds.length &&
        correctOptionIds.every((id: string) => selectedIds.includes(id)) &&
        selectedIds.every((id: string) => correctOptionIds.includes(id));

      return {
        pointsAwarded: isCorrect ? questionPoints : 0,
        feedback: isCorrect
          ? "Correct!"
          : `Incorrect. The correct answer(s): ${correctOptionIds
              .map(
                (id: string) =>
                  questionData.options.find((o: any) => o.id === id)?.text,
              )
              .join(", ")}`,
        gradingStatus: "AUTO_GRADED",
      };
    }

    case "true_false": {
      const isCorrect = response?.answer === questionData.correctAnswer;
      return {
        pointsAwarded: isCorrect ? questionPoints : 0,
        feedback: isCorrect
          ? "Correct!"
          : `Incorrect. The correct answer was: ${questionData.correctAnswer}`,
        gradingStatus: "AUTO_GRADED",
      };
    }

    case "fill_ups": {
      const expectedBlanks: any[] = questionData.blanks || [];
      const submittedBlanks: any[] = response?.blanks || [];

      let allCorrect = true;
      const blankResults: string[] = [];

      for (const expected of expectedBlanks) {
        const submitted = submittedBlanks.find(
          (b: any) => b.index === expected.index,
        );
        if (
          !submitted ||
          !submitted.answer ||
          submitted.answer.trim().toLowerCase() !==
            expected.answer.trim().toLowerCase()
        ) {
          allCorrect = false;
          blankResults.push(
            `Blank ${expected.index + 1}: Expected "${expected.answer}", got "${submitted?.answer || "(empty)"}"`,
          );
        } else {
          blankResults.push(`Blank ${expected.index + 1}: Correct`);
        }
      }

      return {
        pointsAwarded: allCorrect ? questionPoints : 0,
        feedback: allCorrect ? "All blanks correct!" : blankResults.join("; "),
        gradingStatus: "AUTO_GRADED",
      };
    }

    case "long_answer": {
      return await gradeLongAnswer(
        questionText,
        questionData,
        questionPoints,
        response,
      );
    }

    case "content_block": {
      return {
        pointsAwarded: 0,
        feedback: null,
        gradingStatus: "AUTO_GRADED",
      };
    }

    default:
      return {
        pointsAwarded: 0,
        feedback: "Unknown question type",
        gradingStatus: "AUTO_GRADED",
      };
  }
}

// ─── AI-powered long answer grading ──────────────────────────────

async function gradeLongAnswer(
  questionText: string,
  questionData: any,
  questionPoints: number,
  response: any,
): Promise<{
  pointsAwarded: number;
  feedback: string | null;
  gradingStatus: "AI_GRADED";
}> {
  const rubric: any[] = questionData.rubric || [];
  const goldenSolution: string = questionData.goldenSolution || "";
  const traineeAnswer: string = response?.answer || "";

  if (!traineeAnswer.trim()) {
    return {
      pointsAwarded: 0,
      feedback: "No answer provided.",
      gradingStatus: "AI_GRADED",
    };
  }

  if (rubric.length === 0) {
    return {
      pointsAwarded: questionPoints,
      feedback: "Answer accepted (no rubric configured).",
      gradingStatus: "AI_GRADED",
    };
  }

  const rubricDescription = rubric
    .map(
      (r, i) =>
        `${i + 1}. "${r.title}" (weight: ${r.weight}%): ${r.description || "No description"}`,
    )
    .join("\n");

  const prompt = `You are a strict but fair exam grader. Grade the following answer against each rubric criterion.

**Question:** ${questionText}

**Golden/Model Solution:** ${goldenSolution || "Not provided"}

**Rubric Criteria:**
${rubricDescription}

**Trainee's Answer:** ${traineeAnswer}

**Instructions:**
- For each rubric criterion, determine if the criterion is FULLY met.
- A criterion is either fully met (award its full weight) or not met (award 0). No partial credit.
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
  "overallFeedback": "1-2 sentence summary feedback for the student"
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
    const criteria: any[] = result.criteria || [];

    let totalWeightMet = 0;
    const feedbackParts: string[] = [];

    for (const criterion of criteria) {
      const rubricItem = rubric.find(
        (r) => r.title.toLowerCase() === criterion.title?.toLowerCase(),
      );
      if (rubricItem && criterion.met) {
        totalWeightMet += rubricItem.weight;
      }
      feedbackParts.push(
        `• ${criterion.title}: ${criterion.met ? "✓ Met" : "✗ Not met"} — ${criterion.reasoning || ""}`,
      );
    }

    const pointsAwarded = Math.round((totalWeightMet / 100) * questionPoints);

    const feedback = [
      ...feedbackParts,
      "",
      `Overall: ${result.overallFeedback || ""}`,
      `Score: ${pointsAwarded}/${questionPoints} (${totalWeightMet}% of rubric met)`,
    ].join("\n");

    return {
      pointsAwarded,
      feedback,
      gradingStatus: "AI_GRADED",
    };
  } catch (error) {
    console.error("OpenAI grading error:", error);
    return {
      pointsAwarded: 0,
      feedback: "AI grading failed. This question needs manual review.",
      gradingStatus: "AI_GRADED",
    };
  }
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

// ─── Worker Process ──────────────────────────────────────────────

const processQuizGrading = async (
  job: Job<QuizGradingJobData>,
): Promise<void> => {
  const { quizAttemptId, quizId, traineeProgressId, projectId } = job.data;

  console.log(`🔄 [QuizGrading] Starting grading for attempt ${quizAttemptId}`);

  try {
    const quizAttempt = await prisma.quizAttempt.findUnique({
      where: { id: quizAttemptId },
      include: {
        quiz: true,
        responses: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!quizAttempt) {
      throw new Error(`QuizAttempt ${quizAttemptId} not found`);
    }

    if (quizAttempt.status !== "SUBMITTED") {
      console.log(
        `[QuizGrading] Attempt ${quizAttemptId} status is ${quizAttempt.status}, skipping`,
      );
      return;
    }

    let totalScore = 0;
    let maxScore = 0;

    for (const response of quizAttempt.responses) {
      const question = response.question;
      maxScore += question.points;

      const gradeResult = await gradeQuestion(
        question.type,
        question.question,
        question.data as any,
        question.points,
        response.response as any,
      );

      totalScore += gradeResult.pointsAwarded;

      await prisma.quizQuestionResponse.update({
        where: { id: response.id },
        data: {
          pointsAwarded: gradeResult.pointsAwarded,
          maxPoints: question.points,
          feedback: gradeResult.feedback,
          gradingStatus: gradeResult.gradingStatus,
        },
      });
    }

    const passingPercent = quizAttempt.quiz.passingPercent;
    const scorePercent = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const passed = scorePercent >= passingPercent;

    await prisma.quizAttempt.update({
      where: { id: quizAttemptId },
      data: {
        status: "GRADED",
        totalScore,
        maxScore,
        passed,
        gradedAt: new Date(),
      },
    });

    // If passed, advance to next content
    if (passed) {
      const traineeProgress = await prisma.traineeProgress.findUnique({
        where: { id: traineeProgressId },
      });

      if (traineeProgress?.currentContentId) {
        await advanceToNextContent(
          traineeProgressId,
          traineeProgress.currentContentId,
          projectId,
        );
      }
    }

    console.log(
      `✅ [QuizGrading] Completed: ${quizAttemptId} — ${totalScore}/${maxScore} (${scorePercent.toFixed(1)}%) — ${passed ? "PASSED" : "FAILED"}`,
    );
  } catch (error) {
    console.error(
      `❌ [QuizGrading] Error grading attempt ${quizAttemptId}:`,
      error,
    );
    throw error;
  }
};

// ─── Start Worker ────────────────────────────────────────────────

const startWorker = async () => {
  const worker = new Worker("quiz-grading", processQuizGrading, {
    connection: redisConnection,
    concurrency: 3,
    stalledInterval: 300_000,  // check stalled jobs every 5 min (default: 30s)
    lockDuration: 300_000,
    lockRenewTime: 150_000,
    limiter: {
      max: 10,
      duration: 60000, // max 10 jobs per minute (respect OpenAI rate limits)
    },
  });

  worker.on("completed", (job) => {
    console.log(`✅ [QuizGrading] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`❌ [QuizGrading] Job ${job?.id} failed:`, err.message);
  });

  worker.on("error", (err) => {
    console.error("[QuizGrading] Worker error:", err);
  });

  console.log("👷 Quiz grading worker started. Waiting for jobs...");
};

startWorker().catch(console.error);
