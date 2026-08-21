import { config } from 'dotenv';
config();
import { prisma } from '../src/lib/prisma';

async function main() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: 'ayush kumar', mode: 'insensitive' } },
    include: {
      coachProfile: true,
      studentProfile: true,
    }
  });

  if (!user) {
    console.log("User Ayush Kumar not found.");
    return;
  }
  console.log("User found:", user.name, "Role:", user.role);

  if (user.coachProfile) {
    const coachId = user.coachProfile.id;
    // Find batches assigned to this coach
    const batches = await prisma.batch.findMany({
      where: { coachProfileId: coachId },
      include: {
        classInstances: {
          where: {
            // Looking for class on 18 aug
            date: {
              gte: new Date('2026-08-18T00:00:00Z'),
              lt: new Date('2026-08-19T00:00:00Z')
            }
          },
          include: {
            batch: true
          }
        }
      }
    });
    console.log("Batches assigned to coach:", batches.map(b => ({
      id: b.id, name: b.name, classesCount: b.classInstances.length, classes: b.classInstances
    })));
  }
}

main().finally(() => prisma.$disconnect());
