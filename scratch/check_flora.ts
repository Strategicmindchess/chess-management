import { prisma } from '../src/lib/prisma';

async function main() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: 'Flora', mode: 'insensitive' } }
  });

  if (!user) {
    console.log("Flora not found");
    return;
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id }
  });

  if (!profile) {
    console.log("Student profile not found");
    return;
  }

  console.log("Profile details:", profile);
}

main().catch(console.error).finally(() => prisma.$disconnect());
