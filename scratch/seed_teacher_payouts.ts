import "dotenv/config";
import { prisma } from '../src/lib/prisma';

async function main() {
  const email = "teacher@gmail.com";
  let user = await prisma.user.findUnique({
    where: { email },
    include: { coachProfile: true }
  });

  if (!user) {
    console.log(`User ${email} not found!`);
    return;
  }

  console.log(`User found: ${user.id} (${user.role})`);
  let coachProfile = user.coachProfile;
  
  if (!coachProfile) {
    console.log(`No CoachProfile found for ${email}. Creating one...`);
    coachProfile = await prisma.coachProfile.create({
      data: {
        userId: user.id,
        tdsApplicable: false,
      }
    });
    console.log(`Created CoachProfile: ${coachProfile.id}`);
  }

  // Ensure they have a Batch
  let batch = await prisma.batch.findFirst({
    where: { coachProfileId: coachProfile.id }
  });

  if (!batch) {
    console.log("Creating a test batch...");
    batch = await prisma.batch.create({
      data: {
        name: "Test Penalty Batch",
        code: "TPB-01",
        coach: { connect: { id: coachProfile.id } },
        level: "BEGINNER",
        type: "GROUP_SESSION",
        isActive: true,
        meetLink: "https://meet.google.com/test",
      }
    });
  }

  // Create a ClassInstance and ClassLog for CURRENT month
  const today = new Date();
  
  console.log("Creating a class instance and class log with penalty...");
  const instance = await prisma.classInstance.create({
    data: {
      batch: { connect: { id: batch.id } },
      date: today,
      startTime: "19:00",
      endTime: "20:00",
      status: "COMPLETED",
      startedAt: new Date(today.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      completedAt: new Date(today.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
    }
  });

  await prisma.classLog.create({
    data: {
      coach: { connect: { id: coachProfile.id } },
      batch: { connect: { id: batch.id } },
      classInstance: { connect: { id: instance.id } },
      date: today,
      durationMins: 60,
      topicCovered: "Tactics and Penalties",
      payoutAmount: 500, // They earned 500
      penaltyAmount: 250, // But got penalized 250
      penaltyNote: "Late join: 5 min late (₹100); Camera OFF >5 min reported by 3/3 students (₹150)",
      penaltyCalculatedAt: new Date(),
      penaltyWaived: false,
      hasPhonePenalty: false,
      attendanceMarkedAt: new Date(),
      coachJoinedAt: new Date(today.getTime() - 2 * 60 * 60 * 1000), // joined late
    }
  });

  console.log("Done! You can now check the teacher/payouts page.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
