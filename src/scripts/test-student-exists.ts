import { prisma } from '../lib/prisma';

async function checkStudent() {
  const studentId = 'cmsw9md1o0002cgiajoso6tiw';
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      user: { select: { email: true } },
      chessAccount: true
    }
  });

  console.log("Student in DB:", JSON.stringify(student, null, 2));
}

checkStudent().finally(() => prisma.$disconnect());
