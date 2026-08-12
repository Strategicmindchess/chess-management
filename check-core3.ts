import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function main() {
  const { prisma } = await import('./src/lib/prisma');
  
  const resources = await prisma.resource.findMany({
    where: {
      level: 'CORE_3' as any
    },
    orderBy: {
      lectureNumber: 'asc'
    }
  });

  console.log(`Found ${resources.length} resources for CORE_3`);
  
  for (const r of resources) {
    console.log(`Lecture ${r.lectureNumber}: [${r.type}] ${r.title}`);
  }
}

main().catch(console.error).finally(async () => {
  const { prisma } = await import('./src/lib/prisma');
  await prisma.$disconnect();
});
