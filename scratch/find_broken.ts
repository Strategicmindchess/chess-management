import { prisma } from '../src/lib/prisma';

async function main() {
  const brokenResources = await prisma.resource.findMany({
    where: { url: '#' }
  });

  console.log(`Found ${brokenResources.length} resources with '#' as URL:`);
  for (const r of brokenResources) {
    console.log(`- ID: ${r.id}, Level: ${r.level}, Lecture: ${r.lectureNumber}, Title: ${r.title}, Source: ${r.source}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
