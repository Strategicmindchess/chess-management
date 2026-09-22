/**
 * Fix duplicate chocolate_question_records before applying unique constraint.
 * Keeps the LATEST record per (studentProfileId, classDate) and deletes older duplicates.
 */
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🔍 Scanning for duplicate chocolate_question_records (studentProfileId + classDate)...\n');

  // Fetch all records grouped by studentProfileId + classDate
  const allRecords = await prisma.chocolateQuestionRecord.findMany({
    orderBy: [
      { studentProfileId: 'asc' },
      { classDate: 'asc' },
      { createdAt: 'desc' }, // newest first so we keep index 0
    ],
  });

  // Group by composite key
  const groups = new Map<string, typeof allRecords>();
  for (const rec of allRecords) {
    const key = `${rec.studentProfileId}::${rec.classDate.toISOString().slice(0, 10)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(rec);
  }

  // Find groups with duplicates
  const duplicateGroups = [...groups.entries()].filter(([, recs]) => recs.length > 1);

  if (duplicateGroups.length === 0) {
    console.log('✅ No duplicates found! Schema push should work cleanly.\n');
  } else {
    console.log(`⚠️  Found ${duplicateGroups.length} duplicate group(s):\n`);
    
    const idsToDelete: string[] = [];

    for (const [key, recs] of duplicateGroups) {
      const [kept, ...extras] = recs; // keep newest (first due to sort), delete rest
      console.log(`  Key: ${key}`);
      console.log(`    Keeping: id=${kept.id} (created ${kept.createdAt.toISOString()})`);
      for (const extra of extras) {
        console.log(`    Deleting: id=${extra.id} (created ${extra.createdAt.toISOString()})`);
        idsToDelete.push(extra.id);
      }
    }

    console.log(`\n🗑️  Deleting ${idsToDelete.length} duplicate record(s)...`);
    const result = await prisma.chocolateQuestionRecord.deleteMany({
      where: { id: { in: idsToDelete } },
    });
    console.log(`✅ Deleted ${result.count} duplicate records.\n`);
  }

  // Now recalculate eligibility for affected students
  console.log('🔄 Recalculating eligibility for all students with chocolate records...');
  const distinctStudents = await prisma.chocolateQuestionRecord.findMany({
    distinct: ['studentProfileId'],
    select: { studentProfileId: true },
  });

  for (const { studentProfileId } of distinctStudents) {
    const month = new Date().toISOString().slice(0, 7); // current month YYYY-MM
    const records = await prisma.chocolateQuestionRecord.findMany({
      where: {
        studentProfileId,
        classDate: {
          gte: new Date(`${month}-01`),
          lt: new Date(new Date(`${month}-01`).setMonth(new Date(`${month}-01`).getMonth() + 1)),
        },
      },
    });

    const total = records.reduce((sum, r) => sum + r.points, 0);
    const clamped = Math.min(Math.max(total, 0), 40);

    await prisma.chocolateEligibility.upsert({
      where: {
        studentProfileId_month: { studentProfileId, month },
      },
      update: {
        totalPoints: clamped,
        isEligible: clamped >= 38,
      },
      create: {
        studentProfileId,
        month,
        totalPoints: clamped,
        isEligible: clamped >= 38,
        claimStatus: 'NOT_CLAIMED',
      },
    });
  }

  console.log(`✅ Recalculated eligibility for ${distinctStudents.length} student(s).\n`);
  console.log('🎉 Done! You can now safely run: npx prisma db push');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
