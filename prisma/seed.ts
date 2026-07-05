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

  const coach = await prisma.user.upsert({
    where: { email: "coach.demo@strategicmindchess.com" },
    update: {},
    create: {
      name: "Demo Coach",
      email: "coach.demo@strategicmindchess.com",
      phone: "9876543210",
      passwordHash: await hashPassword("Coach@123"),
      role: Role.TEACHER,
      emailVerified: true,
      coachProfile: {
        create: {
          bio: "Experienced chess coach",
          city: "Jhansi",
        }
      }
    },
  });
  console.log(`Demo coach ready: ${coach.email} / Coach@123`);

  const student = await prisma.user.upsert({
    where: { email: "student.demo@strategicmindchess.com" },
    update: {},
    create: {
      name: "Demo Student",
      email: "student.demo@strategicmindchess.com",
      phone: "9123456780",
      passwordHash: await hashPassword("Student@123"),
      role: Role.STUDENT,
      emailVerified: true,
      studentProfile: {
        create: {
          parentName: "Demo Parent",
          parentPhone: "9123456781",
          city: "Jhansi",
          chessComId: "demo_student",
          lichessId: "demo_student_lichess",
          rating: 1200,
          monthlyFee: 2000,
          perSessionFee: 300,
          assignedCoachId: null, // Will set later if needed
        }
      }
    },
  });
  console.log(`Demo student ready: ${student.email} / Student@123`);

  const batch = await prisma.batch.upsert({
    where: { code: "DEMO-01" },
    update: {},
    create: {
      name: "Weekend Beginners",
      code: "DEMO-01",
      meetLink: "https://meet.google.com/demo-batch-link",
      coachId: coach.id,
      schedules: {
        create: [
          { day: Weekday.SATURDAY, startTime: "10:00", endTime: "11:00" },
          { day: Weekday.SUNDAY, startTime: "10:00", endTime: "11:00" },
        ],
      },
    },
  });
  console.log(`Demo batch ready: ${batch.code} (coach assigned)`);

  await prisma.batchStudent.upsert({
    where: { batchId_studentId: { batchId: batch.id, studentId: student.id } },
    update: {},
    create: { batchId: batch.id, studentId: student.id },
  });
  console.log("Demo student enrolled in the demo batch.");
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
