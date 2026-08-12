import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { prisma } from '../src/lib/prisma';
import { BatchLevel } from '../src/generated/prisma/client';

async function main() {
  const coachId = 'cmskvsw1q000104l2u8qa7h0b'; // 'test' coach
  const studentId = 'cmskvbk4q000304jmds7xwu7y'; // 'test' student
  
  console.log("Creating demo batch for assignment testing for test users...");

  // Create Batch
  const batch = await prisma.batch.create({
    data: {
      name: "Assignment Test Batch - Test Users",
      code: "DEMO-TEST-USERS-" + Date.now().toString().slice(-4),
      meetLink: "https://meet.google.com/test",
      type: "GROUP_SESSION",
      coachProfileId: coachId,
      level: BatchLevel.INTERMEDIATE_2,
      startSession: 1,
      isActive: true,
      students: {
        create: {
          studentProfileId: studentId
        }
      }
    }
  });

  console.log(`Created batch: ${batch.name} (${batch.code}) with ID ${batch.id}`);

  // Create 5 past classes
  const pastClasses = [];
  const today = new Date();
  
  for (let i = 1; i <= 5; i++) {
    const classDate = new Date(today);
    classDate.setDate(today.getDate() - (7 - i));
    
    // Set to a strict UTC midnight
    const utcDate = new Date(Date.UTC(classDate.getUTCFullYear(), classDate.getUTCMonth(), classDate.getUTCDate()));

    pastClasses.push({
      batchId: batch.id,
      date: utcDate,
      startTime: "10:00",
      endTime: "11:00",
      status: "SCHEDULED" as const,
      sessionNumber: i,
      lectureName: `Test Lecture ${i}`
    });
  }

  await prisma.classInstance.createMany({
    data: pastClasses
  });

  console.log(`Created 5 past ClassInstances for testing assignments for test users.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
