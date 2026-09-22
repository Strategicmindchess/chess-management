import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const email = "teacher@gmail.com";
  const user = await prisma.user.findUnique({
    where: { email },
    include: { coachProfile: true }
  });

  if (!user) {
    console.log(`User ${email} not found!`);
  } else {
    console.log(`User found: ${user.id} (${user.role})`);
    if (user.coachProfile) {
      console.log(`CoachProfile found: ${user.coachProfile.id}`);
    } else {
      console.log(`No CoachProfile found for ${email}. Creating one...`);
      const coachProfile = await prisma.coachProfile.create({
        data: {
          userId: user.id,
          phone: "1234567890",
          payoutRate: 500,
          tdsApplicable: false,
        }
      });
      console.log(`Created CoachProfile: ${coachProfile.id}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
