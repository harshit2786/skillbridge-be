-- CreateTable
CREATE TABLE "Webinar" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "zoomMeetingId" TEXT NOT NULL,
    "zoomJoinUrl" TEXT NOT NULL,
    "zoomStartUrl" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "hostTrainerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Webinar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebinarRegistration" (
    "id" TEXT NOT NULL,
    "webinarId" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebinarRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Webinar_projectId_idx" ON "Webinar"("projectId");

-- CreateIndex
CREATE INDEX "Webinar_scheduledAt_idx" ON "Webinar"("scheduledAt");

-- CreateIndex
CREATE INDEX "WebinarRegistration_webinarId_idx" ON "WebinarRegistration"("webinarId");

-- CreateIndex
CREATE UNIQUE INDEX "WebinarRegistration_webinarId_traineeId_key" ON "WebinarRegistration"("webinarId", "traineeId");

-- AddForeignKey
ALTER TABLE "Webinar" ADD CONSTRAINT "Webinar_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webinar" ADD CONSTRAINT "Webinar_hostTrainerId_fkey" FOREIGN KEY ("hostTrainerId") REFERENCES "Trainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebinarRegistration" ADD CONSTRAINT "WebinarRegistration_webinarId_fkey" FOREIGN KEY ("webinarId") REFERENCES "Webinar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebinarRegistration" ADD CONSTRAINT "WebinarRegistration_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
