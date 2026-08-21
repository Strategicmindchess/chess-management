import { config } from 'dotenv';
config();
import { prisma } from '../src/lib/prisma';

async function main() {
  const logs = await prisma.classLog.findMany({
    where: { batchId: 'cms7rjgbr000404l2sufg7emg' }
  });
  console.log("Class logs for batch:", logs);
}
main().finally(() => prisma.$disconnect());
