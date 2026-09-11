const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = 'shivamgupta.2dev1@gmail.com';
  console.log(`Finding user with email: ${email}`);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { coachProfile: true }
  });

  if (!user) {
    console.error('User not found!');
    return;
  }

  let coachId = user.coachProfile?.id;

  if (!coachId) {
    console.log('User does not have a coach profile, creating one...');
    const coach = await prisma.coachProfile.create({
      data: {
        userId: user.id,
      }
    });
    coachId = coach.id;
  }

  console.log(`Coach ID: ${coachId}`);

  // Create a new Batch
  const batchCode = `BATCH-${Math.random().toString(36).substring(7).toUpperCase()}`;
  console.log(`Creating batch: ${batchCode}`);
  const batch = await prisma.batch.create({
    data: {
      name: 'Special Class',
      code: batchCode,
      meetLink: 'https://meet.google.com/abc-defg-hij',
      coachProfileId: coachId,
      type: 'GROUP_SESSION',
      payoutRate: 500,
    }
  });

  console.log(`Batch created: ${batch.id}`);

  // Create some ClassInstances
  console.log('Adding classes to the batch...');
  const today = new Date();
  
  const classInstances = [];
  for (let i = 0; i < 5; i++) {
    const classDate = new Date(today);
    classDate.setDate(today.getDate() + i);
    
    classInstances.push({
      batchId: batch.id,
      date: classDate,
      startTime: '10:00 AM',
      endTime: '11:00 AM',
      status: 'SCHEDULED',
      lectureName: `Lecture ${i + 1}`,
      sessionNumber: i + 1,
    });
  }

  await prisma.classInstance.createMany({
    data: classInstances
  });

  console.log(`Successfully added ${classInstances.length} classes for ${email}!`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
