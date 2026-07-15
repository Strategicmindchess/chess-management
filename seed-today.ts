import { config } from 'dotenv';
config({ path: '.env.local' });
import { prisma } from './src/lib/prisma';

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  let coach = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
  
  if (!coach) {
    coach = await prisma.user.create({
      data: {
        email: 'testcoach2@smc.com',
        name: 'Test Coach 2',
        role: 'TEACHER',
        passwordHash: 'dummy',
      }
    });
  }

  const today = new Date();
  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const currentDay = dayNames[today.getDay()];

  const existingBatch = await prisma.batch.findUnique({ where: { code: 'TODAY-BATCH-1' } });
  if (!existingBatch) {
    await prisma.batch.create({
      data: {
        name: 'Today Active Batch',
        code: 'TODAY-BATCH-1',
        meetLink: 'https://meet.google.com/abc-defg-hij',
        coachId: coach.id,
        schedules: {
          create: [{
            // @ts-ignore
            day: currentDay,
            startTime: '08:00',
            endTime: '22:00'
          }]
        }
      }
    });
    console.log('Created batch for today');
  } else {
    console.log('Batch already exists for today');
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
