import { prisma } from '../src/lib/prisma';
import { BatchLevel } from '@prisma/client';

async function main() {
  const resources = await prisma.resource.findMany({
    where: { level: 'ADVANCE_2' },
  });

  console.log(`Found ${resources.length} resources for ADVANCE_2 syllabus.`);
  
  if (resources.length > 0) {
    console.log(resources.map(r => `- ${r.title} (Lecture ${r.lectureNumber})`).join('\n'));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
