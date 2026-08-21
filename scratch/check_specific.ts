import { config } from 'dotenv';
config();
import { prisma } from '../src/lib/prisma';

async function main() {
  const instanceId = 'cmsydki3s001k18k2mug0szri';
  const classInstance = await prisma.classInstance.findUnique({
    where: { id: instanceId }
  });
  
  console.log("== CLASS INSTANCE (Aug 18) ==");
  console.log("Status:", classInstance?.status);
  console.log("ClassLog ID:", classInstance?.classLogId);
  console.log("Lecture Name:", classInstance?.lectureName);

  const logs = await prisma.classLog.findMany({
    where: { batchId: 'cms7rjgbr000404l2sufg7emg', topicCovered: { contains: 'Lecture 13' } }
  });

  console.log("\n== PREVIOUS CLASS LOGS FOR 'Lecture 13' ==");
  logs.forEach(log => {
    console.log(`- Date: ${log.date.toISOString()} | Topic: ${log.topicCovered}`);
  });
}

main().finally(() => prisma.$disconnect());
