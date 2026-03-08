-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('QUIZ', 'COURSE');

-- CreateTable
CREATE TABLE "ProjectContent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "quizId" TEXT,
    "courseId" TEXT,
    "position" INTEGER NOT NULL,

    CONSTRAINT "ProjectContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectContent_id_key" ON "ProjectContent"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectContent_quizId_key" ON "ProjectContent"("quizId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectContent_courseId_key" ON "ProjectContent"("courseId");

-- CreateIndex
CREATE INDEX "ProjectContent_projectId_idx" ON "ProjectContent"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectContent_projectId_position_key" ON "ProjectContent"("projectId", "position");

-- AddForeignKey
ALTER TABLE "ProjectContent" ADD CONSTRAINT "ProjectContent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContent" ADD CONSTRAINT "ProjectContent_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContent" ADD CONSTRAINT "ProjectContent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
