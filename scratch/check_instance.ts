import { config } from 'dotenv';
config();
import { prisma } from '../src/lib/prisma';

async function main() {
  const c = await prisma.classInstance.findUnique({
    where: { id: 'cmsydki3s001k18k2mug0szri' },
  });
  console.log(c);
}
main().finally(() => prisma.$disconnect());
