import { prisma } from '../src/lib/prisma';

async function main() {
  const resource = await prisma.resource.findUnique({
    where: { id: 'cmsglzjss0027ggiah604dv2n' }
  });

  if (!resource) {
    console.log("Resource not found");
    return;
  }

  if (resource.url === '#') {
    await prisma.resource.update({
      where: { id: 'cmsglzjss0027ggiah604dv2n' },
      data: { url: 'https://lichess.org/practice/rook-endgames/basic-rook-endgames/pqUSUw8Y' }
    });
    console.log("Successfully updated the resource URL to the correct link.");
  } else {
    console.log("URL is already: " + resource.url);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
