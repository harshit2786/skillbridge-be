-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "QuizAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'GRADED');

-- CreateTable
CREATE TABLE "TraineeProgress" (
    "id" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "currentContentId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TraineeProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseProgress" (
    "id" TEXT NOT NULL,
    "traineeProgressId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "currentSectionOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "CourseStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseQuestionCompletion" (
    "id" TEXT NOT NULL,
    "courseProgressId" TEXT NOT NULL,
    "courseQuestionId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseQuestionCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "traineeProgressId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "currentSectionOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "QuizAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "totalScore" INTEGER,
    "maxScore" INTEGER,
    "passed" BOOLEAN,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestionResponse" (
    "id" TEXT NOT NULL,
    "quizAttemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "pointsAwarded" INTEGER,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizQuestionResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TraineeProgress_traineeId_projectId_idx" ON "TraineeProgress"("traineeId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "TraineeProgress_traineeId_projectId_key" ON "TraineeProgress"("traineeId", "projectId");

-- CreateIndex
CREATE INDEX "CourseProgress_traineeProgressId_idx" ON "CourseProgress"("traineeProgressId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseProgress_traineeProgressId_courseId_key" ON "CourseProgress"("traineeProgressId", "courseId");

-- CreateIndex
CREATE INDEX "CourseQuestionCompletion_courseProgressId_idx" ON "CourseQuestionCompletion"("courseProgressId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseQuestionCompletion_courseProgressId_courseQuestionId_key" ON "CourseQuestionCompletion"("courseProgressId", "courseQuestionId");

-- CreateIndex
CREATE INDEX "QuizAttempt_traineeProgressId_idx" ON "QuizAttempt"("traineeProgressId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAttempt_traineeProgressId_quizId_key" ON "QuizAttempt"("traineeProgressId", "quizId");

-- CreateIndex
CREATE INDEX "QuizQuestionResponse_quizAttemptId_idx" ON "QuizQuestionResponse"("quizAttemptId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizQuestionResponse_quizAttemptId_questionId_key" ON "QuizQuestionResponse"("quizAttemptId", "questionId");

-- AddForeignKey
ALTER TABLE "TraineeProgress" ADD CONSTRAINT "TraineeProgress_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraineeProgress" ADD CONSTRAINT "TraineeProgress_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraineeProgress" ADD CONSTRAINT "TraineeProgress_currentContentId_fkey" FOREIGN KEY ("currentContentId") REFERENCES "ProjectContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseProgress" ADD CONSTRAINT "CourseProgress_traineeProgressId_fkey" FOREIGN KEY ("traineeProgressId") REFERENCES "TraineeProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseProgress" ADD CONSTRAINT "CourseProgress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseQuestionCompletion" ADD CONSTRAINT "CourseQuestionCompletion_courseProgressId_fkey" FOREIGN KEY ("courseProgressId") REFERENCES "CourseProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseQuestionCompletion" ADD CONSTRAINT "CourseQuestionCompletion_courseQuestionId_fkey" FOREIGN KEY ("courseQuestionId") REFERENCES "CourseQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_traineeProgressId_fkey" FOREIGN KEY ("traineeProgressId") REFERENCES "TraineeProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestionResponse" ADD CONSTRAINT "QuizQuestionResponse_quizAttemptId_fkey" FOREIGN KEY ("quizAttemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestionResponse" ADD CONSTRAINT "QuizQuestionResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
