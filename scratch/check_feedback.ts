import { config } from 'dotenv';
config();
import { prisma } from '../src/lib/prisma';

async function main() {
  const feedbacks = await prisma.coachFeedback.findMany({
    where: { 
      student: { 
        user: { 
          name: { contains: 'Fiona Bhatt', mode: 'insensitive' } 
        } 
      } 
    },
    include: {
      coach: {
        include: { user: true }
      },
      student: {
        include: { user: true }
      }
    }
  });

  if (feedbacks.length === 0) {
    console.log("No feedback found for Fiona Bhatt.");
  } else {
    for (const f of feedbacks) {
      console.log(`Feedback by Coach: ${f.coach.user.name}`);
      console.log(`Total Score: ${f.engagement + f.behaviour + f.conceptAdoption + f.joiningOnTime + f.cameraOn}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
