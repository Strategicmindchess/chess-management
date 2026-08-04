import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Finding students without a student profile...");

  // Prisma query to find all users with role 'STUDENT' where studentProfile is null
  const studentsWithoutProfile = await prisma.user.findMany({
    where: {
      role: 'STUDENT',
      studentProfile: {
        is: null
      }
    }
  });

  console.log(`Found ${studentsWithoutProfile.length} students without a profile.`);

  if (studentsWithoutProfile.length === 0) {
    console.log("Nothing to do!");
    return;
  }

  let createdCount = 0;
  for (const student of studentsWithoutProfile) {
    console.log(`Creating profile for: ${student.name} (${student.email})...`);
    try {
      await prisma.studentProfile.create({
        data: {
          userId: student.id,
        }
      });
      createdCount++;
    } catch (error) {
      console.error(`Failed to create profile for ${student.email}:`, error);
    }
  }

  console.log(`Successfully created ${createdCount} missing student profiles!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
