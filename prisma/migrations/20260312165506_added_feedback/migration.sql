-- CreateEnum
CREATE TYPE "ResponseGradingStatus" AS ENUM ('PENDING', 'AUTO_GRADED', 'AI_GRADED', 'MANUALLY_GRADED');

-- AlterTable
ALTER TABLE "QuizAttempt" ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "gradedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "QuizQuestionResponse" ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "gradingStatus" "ResponseGradingStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "maxPoints" INTEGER;
