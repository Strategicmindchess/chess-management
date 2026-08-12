import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function main() {
  const { prisma } = await import('./src/lib/prisma');
  
  const now = new Date();
  const periodType = 'MONTHLY';
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  
  // Find Nikhilesh Bansal
  const user = await prisma.user.findFirst({
    where: { name: { contains: 'Nikhilesh' } },
    include: { studentProfile: true }
  });
  
  if (!user || !user.studentProfile) {
    console.log('Nikhilesh not found');
    return;
  }
  
  const studentProfileId = user.studentProfile.id;
  
  // Get snapshot
  const snapshot = await prisma.chessActivitySnapshot.findFirst({
    where: { studentProfileId, periodType, periodStart }
  });
  
  // Get manual scores
  const feedbacks = await prisma.coachFeedback.findMany({
    where: { studentProfileId, periodType, periodStart }
  });
  const attendances = await prisma.leaderboardAttendance.findMany({
    where: { studentProfileId, periodType, periodStart }
  });
  const assignments = await prisma.assignmentScore.findMany({
    where: { studentProfileId, periodType, periodStart }
  });
  const tournaments = await prisma.tournamentScore.findMany({
    where: { studentProfileId, periodType, periodStart }
  });
  
  console.log('Snapshot:', snapshot);
  console.log('Feedback:', feedbacks.reduce((acc, f) => acc + f.engagement + f.behaviour + f.conceptAdoption + f.joiningOnTime + f.cameraOn, 0));
  console.log('Attendance:', attendances.reduce((acc, a) => acc + a.score, 0));
  console.log('Assignment:', assignments.reduce((acc, a) => acc + a.score, 0));
  console.log('Tournament:', tournaments.reduce((acc, t) => acc + t.score, 0));
}

main().finally(() => process.exit(0));
