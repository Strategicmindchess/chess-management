/**
 * Seed script: Inserts dummy chocolate question marks data for testing.
 * Run with: npx ts-node --project tsconfig.json scratch/seed_chocolate.ts
 * OR: npx tsx scratch/seed_chocolate.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { format, subDays } from "date-fns";

async function main() {
  console.log("🍫 Seeding chocolate marks data...\n");

  const month = format(new Date(), "yyyy-MM");

  // Get existing students and coaches
  const students = await prisma.studentProfile.findMany({
    take: 5,
    include: { user: { select: { name: true } } },
  });

  const coaches = await prisma.coachProfile.findMany({
    take: 2,
    include: { user: { select: { name: true } } },
  });

  if (students.length === 0 || coaches.length === 0) {
    console.error("❌ No students or coaches found. Please create some users first.");
    process.exit(1);
  }

  console.log(`Found ${students.length} students and ${coaches.length} coaches`);
  console.log(`Month: ${month}\n`);

  const coach = coaches[0];

  // Clear existing test data for this month
  await prisma.chocolateQuestionRecord.deleteMany({
    where: { month, coachId: coach.id },
  });
  await prisma.chocolateEligibility.deleteMany({
    where: { month, studentProfileId: { in: students.map((s: any) => s.id) } },
  });

  // Seed marks for each student with different scenarios
  const scenarios = [
    { label: "38 marks — Eligible for chocolate", marks: [5,5,5,5,5,5,5,-2,5] },   // 38 pts
    { label: "30 marks — In progress", marks: [5,5,5,5,5,-2,5,-2,5] },               // 30 pts
    { label: "40 marks — Max reached", marks: [5,5,5,5,5,5,5,5,-2,5,5] },           // 40 pts
    { label: "12 marks — Early stage", marks: [5,5,-2,5,-2,5] },                     // 18 pts
    { label: "0 marks — No marks yet", marks: [] },
  ];

  for (let i = 0; i < Math.min(students.length, scenarios.length); i++) {
    const student = students[i];
    const scenario = scenarios[i];
    let totalPoints = 0;

    console.log(`Student: ${student.user.name} — ${scenario.label}`);

    // Insert marks on different past days
    for (let j = 0; j < scenario.marks.length; j++) {
      const pts = scenario.marks[j];
      const classDate = subDays(new Date(), scenario.marks.length - j); // spread over past days
      classDate.setHours(0, 0, 0, 0);

      try {
        await prisma.chocolateQuestionRecord.upsert({
          where: {
            studentProfileId_classDate: {
              studentProfileId: student.id,
              classDate,
            },
          },
          create: {
            studentProfileId: student.id,
            coachId: coach.id,
            month,
            classDate,
            isCorrect: pts > 0,
            points: pts,
          },
          update: {
            isCorrect: pts > 0,
            points: pts,
          },
        });
        totalPoints = Math.min(Math.max(totalPoints + pts, 0), 40);
      } catch (e) {
        console.warn(`  Skip duplicate classDate for ${student.user.name}`);
      }
    }

    // Upsert eligibility
    const isEligible = totalPoints >= 38;
    await prisma.chocolateEligibility.upsert({
      where: { studentProfileId_month: { studentProfileId: student.id, month } },
      create: {
        studentProfileId: student.id,
        month,
        totalPoints,
        isEligible,
        eligibleAt: isEligible ? new Date() : null,
      },
      update: {
        totalPoints,
        isEligible,
        eligibleAt: isEligible ? new Date() : undefined,
      },
    });

    console.log(`  ✅ Total marks: ${totalPoints}/40  isEligible: ${isEligible}`);
  }

  // Show summary
  const summary = await prisma.chocolateEligibility.findMany({
    where: { month },
    include: { student: { include: { user: { select: { name: true } } } } },
    orderBy: { totalPoints: "desc" },
  });

  console.log("\n📊 Summary for", month);
  console.table(
    summary.map((e: any) => ({
      Student: e.student.user.name,
      Points: `${e.totalPoints}/40`,
      Eligible: e.isEligible ? "✅" : "❌",
    }))
  );

  console.log("\n🍫 Seed complete!");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
