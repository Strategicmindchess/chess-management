import { config } from 'dotenv';
config();
import { prisma } from '../src/lib/prisma';

async function main() {
  const b = await prisma.batch.findUnique({
    where: { id: 'cms7rjgbr000404l2sufg7emg' },
    include: { students: true }
  });
  console.log("Students count:", b?.students.length);
}
main().finally(() => prisma.$disconnect());
