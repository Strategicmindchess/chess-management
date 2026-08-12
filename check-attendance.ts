import 'dotenv/config';
import { prisma } from './src/lib/prisma';

async function main() {
  const records = await prisma.leaderboardAttendance.findMany();
  console.log("Records found:", records.length);
  if (records.length > 0) {
      console.log(records[0]);
  }
}
main().finally(() => prisma.$disconnect());
