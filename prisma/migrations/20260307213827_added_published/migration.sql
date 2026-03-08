-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "_QuizCreators" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_CourseCreators" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_QuizCreators_AB_unique" ON "_QuizCreators"("A", "B");

-- CreateIndex
CREATE INDEX "_QuizCreators_B_index" ON "_QuizCreators"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CourseCreators_AB_unique" ON "_CourseCreators"("A", "B");

-- CreateIndex
CREATE INDEX "_CourseCreators_B_index" ON "_CourseCreators"("B");

-- AddForeignKey
ALTER TABLE "_QuizCreators" ADD CONSTRAINT "_QuizCreators_A_fkey" FOREIGN KEY ("A") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QuizCreators" ADD CONSTRAINT "_QuizCreators_B_fkey" FOREIGN KEY ("B") REFERENCES "Trainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseCreators" ADD CONSTRAINT "_CourseCreators_A_fkey" FOREIGN KEY ("A") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseCreators" ADD CONSTRAINT "_CourseCreators_B_fkey" FOREIGN KEY ("B") REFERENCES "Trainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
