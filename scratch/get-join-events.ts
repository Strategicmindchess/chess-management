import { prisma } from '../src/lib/prisma';

async function main() {
  const events = await prisma.classJoinEvent.findMany({
    include: {
      coachProfile: {
        include: { user: true }
      },
      classInstance: {
        include: { batch: true }
      }
    }
  });

  events.forEach(e => {
    console.log(`----------------------------------------`);
    console.log(`Join Event ID: ${e.id}`);
    console.log(`Batch Name: ${e.classInstance.batch.name}`);
    console.log(`Coach Name: ${e.coachProfile.user.name}`);
    
    // Add timezone adjustment if needed, but UTC to local time string is easiest
    console.log(`Joined At (Local): ${new Date(e.joinedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`Class Instance Date: ${new Date(e.classInstance.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
