import { config } from 'dotenv';
config();
import { submitClassLog } from '../src/actions/class-log-actions';
import { prisma } from '../src/lib/prisma';
import { AttendanceStatus } from '../src/lib/enums';

// Mock getCurrentUser
jest.mock('../src/lib/dal', () => {
  return {
    getCurrentUser: async () => {
      // Find Ayush Kumar
      const user = await prisma.user.findFirst({
        where: { name: { contains: 'ayush kumar', mode: 'insensitive' } }
      });
      return user;
    }
  }
});

async function main() {
  const result = await submitClassLog({
    classInstanceId: 'cmsydki3s001k18k2mug0szri',
    topicCovered: 'Lecture 13: Introduction Sicillian Defence',
    durationMins: 60,
    attendance: []
  });
  console.log("Result:", result);
}

main().finally(() => prisma.$disconnect());
