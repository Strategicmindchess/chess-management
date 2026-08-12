import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function main() {
  const { prisma } = await import('./src/lib/prisma');
  
  const resources = await prisma.resource.findMany({
    select: { level: true, lectureNumber: true, title: true }
  });

  const levelCounts = resources.reduce((acc, r) => {
    const lvl = r.level || 'UNASSIGNED';
    acc[lvl] = (acc[lvl] || 0) + 1;
    return acc;
  }, {});

  console.log('Total resources in DB:', resources.length);
  console.log('Resources by Level:');
  console.table(levelCounts);

  if (resources.length > 0) {
    console.log('\nSample resources:');
    console.log(resources.slice(0, 5));
  }
}

main().catch(console.error).finally(async () => {
  const { prisma } = await import('./src/lib/prisma');
  await prisma.$disconnect();
});
