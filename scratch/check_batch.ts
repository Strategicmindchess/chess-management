import { config } from 'dotenv';
config();
import { prisma } from '../src/lib/prisma';

async function main() {
  const b = await prisma.batch.findUnique({
    where: { id: 'cms7rjgbr000404l2sufg7emg' },
  });
  console.log(b);
}
main().finally(() => prisma.$disconnect());
