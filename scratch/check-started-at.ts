import { prisma } from '../src/lib/prisma';

async function main() {
  const instances = await prisma.classInstance.findMany({
    where: {
      date: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
      batch: {
        coachProfile: {
          user: {
            name: { contains: "Naman" }
          }
        }
      }
    },
    include: { batch: true }
  });

  instances.forEach(inst => {
    console.log(`----------------------------------------`);
    console.log(`Class ID: ${inst.id}`);
    console.log(`Batch: ${inst.batch.name}`);
    console.log(`Started At: ${inst.startedAt ? new Date(inst.startedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'NOT SET'}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
