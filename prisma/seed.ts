import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role, Weekday } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  const adminName = process.env.ADMIN_NAME;
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminName || !adminEmail || !adminPassword) {
    throw new Error("ADMIN_NAME, ADMIN_EMAIL, or ADMIN_PASSWORD is not set.");
  }

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      role: Role.ADMIN,
      emailVerified: true,
    },
  });
  console.log(`Admin ready: ${admin.email} / (password set from .env)`);

  // 1. Generate 10 Coaches with availability
  const coaches = [];
  for (let i = 1; i <= 10; i++) {
    const coachEmail = `coach${i}@strategicmindchess.com`;
    const coach = await prisma.user.upsert({
      where: { email: coachEmail },
      update: {},
      create: {
        name: `Coach ${i}`,
        email: coachEmail,
        phone: `98765432${i.toString().padStart(2, "0")}`,
        passwordHash: await hashPassword("Coach@123"),
        role: Role.TEACHER,
        emailVerified: true,
        coachProfile: {
          create: {
            bio: `Experienced chess coach ${i}`,
            city: "Jhansi",
          }
        }
      },
      include: { coachProfile: true },
    });
    coaches.push(coach);
  }
  console.log("Seeded 10 coaches.");

  // 2. Generate 50 Students
  const students = [];
  for (let i = 1; i <= 50; i++) {
    const studentEmail = `student${i}@strategicmindchess.com`;
    const student = await prisma.user.upsert({
      where: { email: studentEmail },
      update: {},
      create: {
        name: `Student ${i}`,
        email: studentEmail,
        phone: `91234567${i.toString().padStart(2, "0")}`,
        passwordHash: await hashPassword("Student@123"),
        role: Role.STUDENT,
        emailVerified: true,
        studentProfile: {
          create: {
            parentName: `Parent ${i}`,
            parentPhone: `91234567${i.toString().padStart(2, "0")}P`,
            city: "Jhansi",
            chessComId: `student_${i}`,
            lichessId: `student_${i}_lichess`,
            chessComRating: 1000 + (i * 10),
            lichessRating: 1000 + (i * 10),
          }
        }
      },
      include: { studentProfile: true },
    });
    students.push(student);
  }

  console.log("Seeded 50 students.");

  // 3. Generate 10 Batches and enroll 10 students per batch
  for (let i = 1; i <= 10; i++) {
    const batchCode = `BATCH-${i.toString().padStart(2, "0")}`;
    const assignedCoach = coaches[i - 1]; // 10 batches, 10 coaches -> 1 coach per batch
    
    const batch = await prisma.batch.upsert({
      where: { code: batchCode },
      update: {},
      create: {
        name: `Batch ${i} Beginners`,
        code: batchCode,
        meetLink: `https://meet.google.com/demo-batch-${i}`,
        coachProfileId: assignedCoach.coachProfile?.id,
        schedules: {
          create: [
            { day: Weekday.SATURDAY, startTime: "10:00", endTime: "11:00" },
            { day: Weekday.SUNDAY, startTime: "10:00", endTime: "11:00" },
          ],
        },
      },
    });

    // Enroll 10 distinct students in this batch
    for (let j = 0; j < 10; j++) {
      const studentIndex = ((i - 1) * 10 + j) % 50;
      const student = students[studentIndex];
      await prisma.batchStudent.upsert({
        where: { batchId_studentProfileId: { batchId: batch.id, studentProfileId: student.studentProfile?.id! } },
        update: {},
        create: { batchId: batch.id, studentProfileId: student.studentProfile?.id! },
      });
    }
  }
  console.log("Seeded 10 batches with 10 students each.");

  // 4. Generate Leaderboard Data
  const periodStart = new Date();
  periodStart.setUTCDate(1); // start of month
  periodStart.setUTCHours(0, 0, 0, 0);
  const periodEnd = new Date(periodStart);
  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

  const period = await prisma.leaderboardPeriod.upsert({
    where: { periodType_startDate: { periodType: "MONTHLY", startDate: periodStart } },
    update: {},
    create: {
      periodType: "MONTHLY",
      startDate: periodStart,
      endDate: periodEnd,
    }
  });

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const score = Math.floor(Math.random() * 800) + 100;
    const rank = i + 1;

    const snapshot = await prisma.chessActivitySnapshot.upsert({
      where: {
        studentProfileId_periodType_periodStart: {
          studentProfileId: student.studentProfile!.id,
          periodType: "MONTHLY",
          periodStart: periodStart
        }
      },
      update: {},
      create: {
        studentProfileId: student.studentProfile!.id,
        periodType: "MONTHLY",
        periodStart: periodStart,
        periodEnd: periodEnd,
        rapidGames: Math.floor(Math.random() * 20),
        blitzGames: Math.floor(Math.random() * 20),
        puzzleAttempts: Math.floor(Math.random() * 50),
        puzzleSolved: Math.floor(Math.random() * 30),
      }
    });

    await prisma.leaderboardEntry.upsert({
      where: {
        studentProfileId_periodType_periodStart: {
          studentProfileId: student.studentProfile!.id,
          periodType: "MONTHLY",
          periodStart: periodStart
        }
      },
      update: { totalScore: score, rank: rank },
      create: {
        studentProfileId: student.studentProfile!.id,
        snapshotId: snapshot.id,
        periodType: "MONTHLY",
        periodStart: periodStart,
        totalScore: score,
        rank: rank,
        rapidClassicalPoints: Math.floor(Math.random() * 50),
        blitzPoints: Math.floor(Math.random() * 30),
        puzzlePoints: Math.floor(Math.random() * 40),
      }
    });
  }
  console.log("Seeded monthly leaderboard data.");

  // 5. Generate Weekly Leaderboard Data
  const currentNow = new Date();
  const dayOfWeek = currentNow.getUTCDay(); // 0 is Sunday, 1 is Monday
  const diffToMonday = currentNow.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
  const weeklyStart = new Date(currentNow.setUTCDate(diffToMonday));
  weeklyStart.setUTCHours(0, 0, 0, 0);

  const weeklyEnd = new Date(weeklyStart);
  weeklyEnd.setUTCDate(weeklyEnd.getUTCDate() + 7);

  await prisma.leaderboardPeriod.upsert({
    where: { periodType_startDate: { periodType: "WEEKLY", startDate: weeklyStart } },
    update: {},
    create: {
      periodType: "WEEKLY",
      startDate: weeklyStart,
      endDate: weeklyEnd,
    }
  });

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const score = Math.floor(Math.random() * 400) + 50;
    const rank = i + 1;

    const snapshot = await prisma.chessActivitySnapshot.upsert({
      where: {
        studentProfileId_periodType_periodStart: {
          studentProfileId: student.studentProfile!.id,
          periodType: "WEEKLY",
          periodStart: weeklyStart
        }
      },
      update: {},
      create: {
        studentProfileId: student.studentProfile!.id,
        periodType: "WEEKLY",
        periodStart: weeklyStart,
        periodEnd: weeklyEnd,
        rapidGames: Math.floor(Math.random() * 10),
        blitzGames: Math.floor(Math.random() * 10),
        puzzleAttempts: Math.floor(Math.random() * 25),
        puzzleSolved: Math.floor(Math.random() * 15),
      }
    });

    await prisma.leaderboardEntry.upsert({
      where: {
        studentProfileId_periodType_periodStart: {
          studentProfileId: student.studentProfile!.id,
          periodType: "WEEKLY",
          periodStart: weeklyStart
        }
      },
      update: { totalScore: score, rank: rank },
      create: {
        studentProfileId: student.studentProfile!.id,
        snapshotId: snapshot.id,
        periodType: "WEEKLY",
        periodStart: weeklyStart,
        totalScore: score,
        rank: rank,
        rapidClassicalPoints: Math.floor(Math.random() * 25),
        blitzPoints: Math.floor(Math.random() * 15),
        puzzlePoints: Math.floor(Math.random() * 20),
      }
    });
  }
  console.log("Seeded weekly leaderboard data.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
