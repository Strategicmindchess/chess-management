/**
 * seed-chocolate.ts
 *
 * Standalone seed script for the Monthly Chocolate Challenge demo.
 *
 * Creates (or upserts) two demo accounts:
 *   - coach@gmail.com          → Role: TEACHER (CoachProfile)
 *   - shivamgupta.2dev1@gmail.com → Role: STUDENT (StudentProfile)
 *
 * Then seeds realistic chocolate question records so both portals
 * show meaningful data immediately on login.
 *
 * Run:  npx tsx prisma/seed-chocolate.ts
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../src/generated/prisma/client";
import { format, subDays, startOfDay } from "date-fns";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set.");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const MONTH = format(new Date(), "yyyy-MM");
const MAX_POINTS = 40;
const REWARD_THRESHOLD = 38;

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

/** Upsert eligibility row from summed records */
async function recalcEligibility(studentProfileId: string, month: string) {
  const agg = await prisma.chocolateQuestionRecord.aggregate({
    where: { studentProfileId, month },
    _sum: { points: true },
  });
  const total = Math.min(Math.max(agg._sum.points ?? 0, 0), MAX_POINTS);
  const isEligible = total >= REWARD_THRESHOLD;

  const existing = await prisma.chocolateEligibility.findUnique({
    where: { studentProfileId_month: { studentProfileId, month } },
  });

  if (existing) {
    return prisma.chocolateEligibility.update({
      where: { id: existing.id },
      data: {
        totalPoints: total,
        isEligible,
        eligibleAt:
          isEligible && !existing.isEligible ? new Date() : existing.eligibleAt,
      },
    });
  }
  return prisma.chocolateEligibility.create({
    data: {
      studentProfileId,
      month,
      totalPoints: total,
      maxPoints: MAX_POINTS,
      rewardThreshold: REWARD_THRESHOLD,
      isEligible,
      eligibleAt: isEligible ? new Date() : null,
    },
  });
}

async function main() {
  console.log("🍫 Starting Chocolate Seed...\n");

  // ── 1. Upsert Coach account ────────────────────────────────────────────────
  const coachEmail = "coach@gmail.com";
  const coachUser = await prisma.user.upsert({
    where: { email: coachEmail },
    update: { role: Role.TEACHER },
    create: {
      name: "Demo Coach",
      email: coachEmail,
      passwordHash: await hash("Coach@123"),
      role: Role.TEACHER,
      emailVerified: true,
      phone: "9999900001",
    },
    include: { coachProfile: true },
  });

  let coachProfile = coachUser.coachProfile;
  if (!coachProfile) {
    coachProfile = await prisma.coachProfile.create({
      data: {
        userId: coachUser.id,
        bio: "Demo coach for chocolate challenge testing",
        city: "Jhansi",
      },
    });
  }
  console.log(`✅ Coach: ${coachEmail}  (pass: Coach@123)`);

  // ── 2. Upsert Student account ──────────────────────────────────────────────
  const studentEmail = "shivamgupta.2dev1@gmail.com";
  const studentUser = await prisma.user.upsert({
    where: { email: studentEmail },
    update: { role: Role.STUDENT },
    create: {
      name: "Shivam Gupta",
      email: studentEmail,
      passwordHash: await hash("Student@123"),
      role: Role.STUDENT,
      emailVerified: true,
      phone: "9999900002",
    },
    include: { studentProfile: true },
  });

  let studentProfile = studentUser.studentProfile;
  if (!studentProfile) {
    studentProfile = await prisma.studentProfile.create({
      data: {
        userId: studentUser.id,
        parentName: "Gupta Ji",
        city: "Jhansi",
        chessComId: "shivam_chess",
        lichessId: "shivam_lichess",
        chessComRating: 1200,
        lichessRating: 1150,
      },
    });
  }
  console.log(`✅ Student: ${studentEmail}  (pass: Student@123)`);

  // ── 3. Upsert a Demo Batch for this coach ─────────────────────────────────
  const batchCode = "CHOC-DEMO-01";
  const batch = await prisma.batch.upsert({
    where: { code: batchCode },
    update: {},
    create: {
      name: "Chocolate Demo Batch",
      code: batchCode,
      meetLink: "https://meet.google.com/chocolate-demo",
      coachProfileId: coachProfile.id,
      isActive: true,
      schedules: {
        create: [
          { day: "MONDAY", startTime: "17:00", endTime: "18:00" },
          { day: "WEDNESDAY", startTime: "17:00", endTime: "18:00" },
          { day: "FRIDAY", startTime: "17:00", endTime: "18:00" },
        ],
      },
    },
  });
  console.log(`✅ Batch: ${batchCode} (${batch.name})`);

  // ── 4. Enroll student in the batch ────────────────────────────────────────
  await prisma.batchStudent.upsert({
    where: {
      batchId_studentProfileId: {
        batchId: batch.id,
        studentProfileId: studentProfile.id,
      },
    },
    update: {},
    create: {
      batchId: batch.id,
      studentProfileId: studentProfile.id,
    },
  });
  console.log(`✅ Student enrolled in ${batchCode}`);

  // ── 5. Seed CURRENT MONTH chocolate records ────────────────────────────────
  // We'll create 6 marking days this month, giving the student 30 total points.
  // Scenario:  +5, +5, +5, +5, +5, +5 = 30 marks → 8 more marks to reach 38!
  // Coach can award on 6 future class days to push them over the threshold.

  const today = startOfDay(new Date());

  const markingDays: { daysAgo: number; isCorrect: boolean }[] = [
    { daysAgo: 12, isCorrect: true },  // +5 → total: 5
    { daysAgo: 10, isCorrect: true },  // +5 → total: 10
    { daysAgo: 8,  isCorrect: false }, // -2 → total: 8
    { daysAgo: 6,  isCorrect: true },  // +5 → total: 13
    { daysAgo: 5,  isCorrect: true },  // +5 → total: 18
    { daysAgo: 4,  isCorrect: true },  // +5 → total: 23
    { daysAgo: 3,  isCorrect: false }, // -2 → total: 21
    { daysAgo: 2,  isCorrect: true },  // +5 → total: 26
    { daysAgo: 1,  isCorrect: true },  // +5 → total: 31
  ];

  let seededDays = 0;
  for (const { daysAgo, isCorrect } of markingDays) {
    const classDate = startOfDay(subDays(today, daysAgo));
    const classMonth = format(classDate, "yyyy-MM");

    // Only seed if in the current month
    if (classMonth !== MONTH) continue;

    const points = isCorrect ? 5 : -2;

    // Skip if already exists (idempotent)
    const exists = await prisma.chocolateQuestionRecord.findUnique({
      where: {
        studentProfileId_classDate: {
          studentProfileId: studentProfile.id,
          classDate,
        },
      },
    });

    if (!exists) {
      await prisma.chocolateQuestionRecord.create({
        data: {
          studentProfileId: studentProfile.id,
          coachId: coachProfile.id,
          month: MONTH,
          classDate,
          isCorrect,
          points,
        },
      });
      seededDays++;
    }
  }
  console.log(`✅ Seeded ${seededDays} chocolate records for current month (${MONTH})`);

  // ── 6. Recalculate eligibility for current month ───────────────────────────
  const eligibility = await recalcEligibility(studentProfile.id, MONTH);
  console.log(
    `✅ Eligibility recalculated: ${eligibility.totalPoints}/${MAX_POINTS} pts — eligible: ${eligibility.isEligible}`
  );

  // ── 7. Seed PREVIOUS MONTHS history (2 months back) ───────────────────────
  const prevMonths = [
    { monthOffset: 1, points: 38, isEligible: true },  // Last month: eligible!
    { monthOffset: 2, points: 22, isEligible: false }, // 2 months ago: not eligible
  ];

  for (const { monthOffset, points: targetPoints, isEligible } of prevMonths) {
    const d = new Date();
    d.setMonth(d.getMonth() - monthOffset);
    const histMonth = format(d, "yyyy-MM");

    const existingHistory = await prisma.chocolateEligibility.findUnique({
      where: {
        studentProfileId_month: {
          studentProfileId: studentProfile.id,
          month: histMonth,
        },
      },
    });

    if (!existingHistory) {
      await prisma.chocolateEligibility.create({
        data: {
          studentProfileId: studentProfile.id,
          month: histMonth,
          totalPoints: targetPoints,
          maxPoints: MAX_POINTS,
          rewardThreshold: REWARD_THRESHOLD,
          isEligible,
          claimStatus: isEligible ? "DELIVERED" : "NOT_CLAIMED",
          rewardGiven: isEligible,
          eligibleAt: isEligible ? new Date(d) : null,
        },
      });
      console.log(`✅ History seeded: ${histMonth} → ${targetPoints} pts (eligible: ${isEligible})`);
    } else {
      console.log(`⚠️  History already exists for ${histMonth}, skipping`);
    }
  }

  // ── 8. Summary ────────────────────────────────────────────────────────────
  console.log("\n🎉 Chocolate seed complete!\n");
  console.log("─────────────────────────────────────────────────────");
  console.log("Login Details:");
  console.log(`  Coach   → ${coachEmail}          / Coach@123`);
  console.log(`  Student → ${studentEmail} / Student@123`);
  console.log("");
  console.log("Current Month State:");
  console.log(`  Month    : ${MONTH}`);
  console.log(`  Total pts: ${eligibility.totalPoints} / ${MAX_POINTS}`);
  console.log(`  Needs    : ${Math.max(0, REWARD_THRESHOLD - eligibility.totalPoints)} more marks for chocolate 🍫`);
  console.log(`  Eligible : ${eligibility.isEligible ? "YES 🎉" : "NOT YET"}`);
  console.log("");
  console.log("What to test:");
  console.log("  1. Login as coach → Teacher Dashboard → Chocolate Challenge panel");
  console.log("     → See Shivam Gupta with current marks & enabled +5/−2 buttons");
  console.log("  2. Click +5 Correct → marks update → buttons disable for today");
  console.log("  3. Login as student → Dashboard → Monthly Chocolate Challenge card");
  console.log("     → See progress bar, history of past months");
  console.log("  4. Once 38 marks reached → 'Claim Chocolate 🍫' button appears");
  console.log("  5. Login as admin → /admin/chocolate → see student in eligible list");
  console.log("─────────────────────────────────────────────────────\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
