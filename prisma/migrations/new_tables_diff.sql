-- CreateEnum
CREATE TYPE "RescheduleRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'APPROVED_WITH_PENALTY', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('FEE_OVERDUE', 'PENALTY_APPLIED', 'ATTENDANCE_ALERT', 'PAYOUT_PROCESSED', 'RESCHEDULE_REQUEST', 'RESCHEDULE_DECISION', 'TICKET_RAISED', 'TICKET_UPDATED', 'CHOCOLATE_ELIGIBLE', 'MANAGEMENT_POINTS_AWARDED');

-- CreateEnum
CREATE TYPE "NotifPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "coach_reschedule_requests" (
    "id" TEXT NOT NULL,
    "classInstanceId" TEXT NOT NULL,
    "coachProfileId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "proposedDate" TIMESTAMP(3) NOT NULL,
    "proposedStartTime" TEXT NOT NULL,
    "proposedEndTime" TEXT NOT NULL,
    "status" "RescheduleRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "penaltyAmount" INTEGER NOT NULL DEFAULT 0,
    "penaltyReason" TEXT,
    "replacementCoachId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_reschedule_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_leaderboard_entries" (
    "id" TEXT NOT NULL,
    "coachProfileId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "studentPerfScore" INTEGER NOT NULL DEFAULT 0,
    "studentFeedScore" INTEGER NOT NULL DEFAULT 0,
    "classQualityScore" INTEGER NOT NULL DEFAULT 0,
    "totalClassesWithFeedback" INTEGER NOT NULL DEFAULT 0,
    "totalFeedbackCount" INTEGER NOT NULL DEFAULT 0,
    "managementPoints" INTEGER NOT NULL DEFAULT 0,
    "managementNote" TEXT,
    "managementAwardedAt" TIMESTAMP(3),
    "managementAwardedById" TEXT,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_leaderboard_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chocolate_question_records" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "points" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chocolate_question_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chocolate_eligibility" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "isEligible" BOOLEAN NOT NULL DEFAULT false,
    "eligibleAt" TIMESTAMP(3),
    "rewardGiven" BOOLEAN NOT NULL DEFAULT false,
    "rewardGivenAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chocolate_eligibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "priority" "NotifPriority" NOT NULL DEFAULT 'NORMAL',
    "eventKey" TEXT NOT NULL,
    "href" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coach_reschedule_requests_coachProfileId_status_idx" ON "coach_reschedule_requests"("coachProfileId", "status");

-- CreateIndex
CREATE INDEX "coach_reschedule_requests_classInstanceId_idx" ON "coach_reschedule_requests"("classInstanceId");

-- CreateIndex
CREATE INDEX "coach_reschedule_requests_status_createdAt_idx" ON "coach_reschedule_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "coach_leaderboard_entries_month_totalScore_idx" ON "coach_leaderboard_entries"("month", "totalScore");

-- CreateIndex
CREATE UNIQUE INDEX "coach_leaderboard_entries_coachProfileId_month_key" ON "coach_leaderboard_entries"("coachProfileId", "month");

-- CreateIndex
CREATE INDEX "chocolate_question_records_studentProfileId_month_idx" ON "chocolate_question_records"("studentProfileId", "month");

-- CreateIndex
CREATE INDEX "chocolate_question_records_coachId_month_idx" ON "chocolate_question_records"("coachId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "chocolate_question_records_studentProfileId_coachId_month_q_key" ON "chocolate_question_records"("studentProfileId", "coachId", "month", "questionNumber");

-- CreateIndex
CREATE INDEX "chocolate_eligibility_month_isEligible_idx" ON "chocolate_eligibility"("month", "isEligible");

-- CreateIndex
CREATE UNIQUE INDEX "chocolate_eligibility_studentProfileId_month_key" ON "chocolate_eligibility"("studentProfileId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_eventKey_key" ON "notifications"("eventKey");

-- CreateIndex
CREATE INDEX "notifications_recipientId_isRead_idx" ON "notifications"("recipientId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_recipientId_createdAt_idx" ON "notifications"("recipientId", "createdAt");

-- AddForeignKey
ALTER TABLE "coach_reschedule_requests" ADD CONSTRAINT "coach_reschedule_requests_classInstanceId_fkey" FOREIGN KEY ("classInstanceId") REFERENCES "class_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_reschedule_requests" ADD CONSTRAINT "coach_reschedule_requests_coachProfileId_fkey" FOREIGN KEY ("coachProfileId") REFERENCES "coach_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_reschedule_requests" ADD CONSTRAINT "coach_reschedule_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_reschedule_requests" ADD CONSTRAINT "coach_reschedule_requests_replacementCoachId_fkey" FOREIGN KEY ("replacementCoachId") REFERENCES "coach_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_leaderboard_entries" ADD CONSTRAINT "coach_leaderboard_entries_coachProfileId_fkey" FOREIGN KEY ("coachProfileId") REFERENCES "coach_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_leaderboard_entries" ADD CONSTRAINT "coach_leaderboard_entries_managementAwardedById_fkey" FOREIGN KEY ("managementAwardedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chocolate_question_records" ADD CONSTRAINT "chocolate_question_records_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chocolate_question_records" ADD CONSTRAINT "chocolate_question_records_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coach_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chocolate_eligibility" ADD CONSTRAINT "chocolate_eligibility_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
