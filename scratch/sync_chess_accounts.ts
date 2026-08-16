import { prisma } from '../src/lib/prisma';

async function main() {
  const profiles = await prisma.studentProfile.findMany({
    include: { chessAccount: true }
  });

  let updated = 0;
  for (const profile of profiles) {
    if (profile.chessAccount) {
      let needsUpdate = false;
      const updateData: any = {};

      if (profile.chessComId && profile.chessAccount.chessComUsername !== profile.chessComId) {
        updateData.chessComUsername = profile.chessComId;
        needsUpdate = true;
      }
      if (profile.lichessId && profile.chessAccount.lichessUsername !== profile.lichessId) {
        updateData.lichessUsername = profile.lichessId;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await prisma.chessAccount.update({
          where: { id: profile.chessAccount.id },
          data: updateData
        });
        updated++;
      }
    } else {
      // Create if completely missing
      if (profile.chessComId || profile.lichessId) {
        await prisma.chessAccount.create({
          data: {
            studentProfileId: profile.id,
            chessComUsername: profile.chessComId,
            lichessUsername: profile.lichessId,
          }
        });
        updated++;
      }
    }
  }

  console.log(`Synced ${updated} chess accounts with legacy student profile fields!`);
}

main().catch(console.error);
