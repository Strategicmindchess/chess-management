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
  const adminName = process.env.ADMIN_NAME || "Super Admin";
  const adminEmail = (
    process.env.ADMIN_EMAIL || "admin@strategicmindchess.com"
  ).toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe@123";

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
            availabilities: {
              create: [
                { dayOfWeek: Weekday.MONDAY, startTime: "16:00", endTime: "18:00" },
                { dayOfWeek: Weekday.WEDNESDAY, startTime: "16:00", endTime: "18:00" },
              ]
            }
          }
        }
      },
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
            rating: 1000 + (i * 10),
            monthlyFee: 2000,
            perSessionFee: 300,
          }
        }
      },
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
        coachId: assignedCoach.id,
        schedules: {
          create: [
            { day: Weekday.SATURDAY, startTime: "10:00", endTime: "11:00" },
            { day: Weekday.SUNDAY, startTime: "10:00", endTime: "11:00" },
          ],
        },
      },
    });

    // Enroll 10 distinct students in this batch
    // We'll just slice the students array: batch 1 gets 0-9, batch 2 gets 10-19, etc.
    const batchStudents = students.slice((i - 1) * 5, (i - 1) * 5 + 10); // Wait, 10*5 = 50. Wait! If I take 10 students per batch, batch 1 gets 0-9, batch 2 gets 10-19... batch 5 gets 40-49. What about batches 6-10?
    // Let's just cycle them or enroll randomly. Using modulo:
    for (let j = 0; j < 10; j++) {
      const studentIndex = ((i - 1) * 10 + j) % 50;
      const student = students[studentIndex];
      await prisma.batchStudent.upsert({
        where: { batchId_studentId: { batchId: batch.id, studentId: student.id } },
        update: {},
        create: { batchId: batch.id, studentId: student.id },
      });
    }
  }
  console.log("Seeded 10 batches with 10 students each.");
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
