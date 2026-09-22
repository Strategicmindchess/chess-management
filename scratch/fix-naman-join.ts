import { prisma } from '../src/lib/prisma';

async function main() {
  // 1. Find Naman's Coach Profile
  const namanUser = await prisma.user.findFirst({
    where: { name: { contains: "Naman" } },
    include: { coachProfile: true }
  });

  if (!namanUser || !namanUser.coachProfile) {
    console.log("Could not find Naman's coach profile");
    return;
  }

  const coachProfileId = namanUser.coachProfile.id;

  // 2. Get today's classes for Naman (Sep 18, 2026)
  const startOfDay = new Date('2026-09-18T00:00:00.000Z');
  const endOfDay = new Date('2026-09-18T23:59:59.999Z');

  const instances = await prisma.classInstance.findMany({
    where: {
      date: { gte: startOfDay, lte: endOfDay },
      batch: { coachProfileId: coachProfileId }
    },
    include: { batch: true }
  });

  console.log(`Found ${instances.length} classes for Naman today.`);

  for (const instance of instances) {
    // 3. Check if join event already exists
    const existingJoin = await prisma.classJoinEvent.findFirst({
      where: { classInstanceId: instance.id, coachProfileId: coachProfileId }
    });

    if (existingJoin) {
      console.log(`- Class: ${instance.batch.name} (Already has a join event, skipping)`);
      continue;
    }

    console.log(`- Creating Join Event for: ${instance.batch.name}`);
    console.log(`  -> Setting Joined Time exactly to Scheduled Time: ${instance.date}`);

    // 4. Insert join event using the exact scheduled class time (0 minutes late = 0 fine)
    await prisma.classJoinEvent.create({
      data: {
        classInstanceId: instance.id,
        coachProfileId: coachProfileId,
        joinedAt: instance.date, // Exact scheduled time
        source: "MANUAL_FIX_NO_FINE"
      }
    });

    // 5. Also ensure the 'startedAt' is exactly the scheduled time so no fine is calculated
    await prisma.classInstance.update({
      where: { id: instance.id },
      data: { startedAt: instance.date }
    });
  }

  console.log("Done! Naman can now mark his attendance with no penalties.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
