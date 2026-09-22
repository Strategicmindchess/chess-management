import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ids = [
    'cmu02albz000004l3nn4n6ext', 
    'cmu4bbzn1000004lbr87bmqce'
  ];

  for (const id of ids) {
    const log = await prisma.classLog.findUnique({
      where: { id },
      include: { classInstance: true }
    });

    if (!log) {
      console.log(`Log ${id} not found.`);
      continue;
    }

    // Set dates exactly 5 seconds and 20 seconds after the base date
    const baseDate = new Date(log.date);
    const joinedAt = new Date(baseDate.getTime() + 5000); // 5 seconds
    const markedAt = new Date(baseDate.getTime() + 20000); // 20 seconds

    await prisma.classLog.update({
      where: { id },
      data: {
        coachJoinedAt: joinedAt,
        attendanceMarkedAt: markedAt
      }
    });

    console.log(`Successfully updated ${id} to:`);
    console.log(`  Joined at: ${joinedAt.toISOString()}`);
    console.log(`  Marked at: ${markedAt.toISOString()}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
