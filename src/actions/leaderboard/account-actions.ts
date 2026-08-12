'use server';

import { prisma } from '@/lib/prisma';
import { requireRole, getCurrentUser } from '@/lib/dal';
import { Role } from '@/lib/enums';
import { verifyChessComUser } from '@/services/chess/chesscom';
import { verifyLichessUser } from '@/services/chess/lichess';
import { chessFetchQueue } from '@/jobs/leaderboard.queues';
import { JOB_NAMES } from '@/lib/leaderboard-config';
import { getCurrentPeriod } from '@/lib/leaderboard-period';
import { revalidatePath } from 'next/cache';

// ── Student self-service ───────────────────────────────────────────────────────

/** Student: link or update their own Chess.com / Lichess usernames */
export async function linkChessAccount(input: {
  chessComUsername?: string | null;
  lichessUsername?: string | null;
}) {
  const user = await requireRole([Role.STUDENT]);

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!studentProfile) {
    return { success: false, error: 'Student profile not found' };
  }

  // Verify usernames exist on the chess platforms
  if (input.chessComUsername) {
    const valid = await verifyChessComUser(input.chessComUsername.trim());
    if (!valid) {
      return { success: false, error: `Chess.com username "${input.chessComUsername}" not found` };
    }
  }

  if (input.lichessUsername) {
    const valid = await verifyLichessUser(input.lichessUsername.trim());
    if (!valid) {
      return { success: false, error: `Lichess username "${input.lichessUsername}" not found` };
    }
  }

  try {
    await prisma.chessAccount.upsert({
      where: { studentProfileId: studentProfile.id },
      create: {
        studentProfileId: studentProfile.id,
        chessComUsername: input.chessComUsername?.trim() || null,
        lichessUsername: input.lichessUsername?.trim() || null,
        chessComVerified: !!input.chessComUsername,
        lichessVerified: !!input.lichessUsername,
      },
      update: {
        ...(input.chessComUsername !== undefined && {
          chessComUsername: input.chessComUsername?.trim() || null,
          chessComVerified: !!input.chessComUsername,
        }),
        ...(input.lichessUsername !== undefined && {
          lichessUsername: input.lichessUsername?.trim() || null,
          lichessVerified: !!input.lichessUsername,
        }),
      },
    });

    // Immediately queue a data fetch so their leaderboard updates quickly
    const saved = await prisma.chessAccount.findUnique({
      where: { studentProfileId: studentProfile.id },
      select: { chessComUsername: true, lichessUsername: true },
    });
    const { periodStart, periodEnd } = getCurrentPeriod('MONTHLY');
    await chessFetchQueue.add(JOB_NAMES.FETCH_STUDENT, {
      studentProfileId: studentProfile.id,
      chessComUsername: saved?.chessComUsername ?? null,
      lichessUsername: saved?.lichessUsername ?? null,
      periodType: 'MONTHLY',
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    }, { removeOnComplete: true, removeOnFail: 50 });

    revalidatePath('/student/profile');
    revalidatePath('/student/leaderboard');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('Unique constraint')) {
      return { success: false, error: 'This username is already linked to another account' };
    }
    return { success: false, error: msg };
  }
}

/** Student: get their own linked chess account */
export async function getMyChessAccount() {
  const user = await requireRole([Role.STUDENT]);

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    include: { chessAccount: true },
  });

  return {
    studentProfileId: studentProfile?.id,
    chessAccount: studentProfile?.chessAccount ?? null,
  };
}

// ── Admin account management ───────────────────────────────────────────────────

/** Admin: link or update chess account for any student, then queue a fetch */
export async function adminLinkChessAccount(
  studentProfileId: string,
  input: {
    chessComUsername?: string | null;
    lichessUsername?: string | null;
    skipVerification?: boolean; // set true for bulk migrations
  }
) {
  await requireRole([Role.ADMIN]);

  if (!input.skipVerification) {
    if (input.chessComUsername) {
      const valid = await verifyChessComUser(input.chessComUsername.trim());
      if (!valid) {
        return { success: false, error: `Chess.com username "${input.chessComUsername}" not found` };
      }
    }
    if (input.lichessUsername) {
      const valid = await verifyLichessUser(input.lichessUsername.trim());
      if (!valid) {
        return { success: false, error: `Lichess username "${input.lichessUsername}" not found` };
      }
    }
  }

  try {
    await prisma.chessAccount.upsert({
      where: { studentProfileId },
      create: {
        studentProfileId,
        chessComUsername: input.chessComUsername?.trim() || null,
        lichessUsername: input.lichessUsername?.trim() || null,
        chessComVerified: !input.skipVerification && !!input.chessComUsername,
        lichessVerified: !input.skipVerification && !!input.lichessUsername,
      },
      update: {
        ...(input.chessComUsername !== undefined && {
          chessComUsername: input.chessComUsername?.trim() || null,
          chessComVerified: !input.skipVerification && !!input.chessComUsername,
        }),
        ...(input.lichessUsername !== undefined && {
          lichessUsername: input.lichessUsername?.trim() || null,
          lichessVerified: !input.skipVerification && !!input.lichessUsername,
        }),
      },
    });

    // Queue a fetch job right after linking so the data is ready for the leaderboard
    const saved = await prisma.chessAccount.findUnique({
      where: { studentProfileId },
      select: { chessComUsername: true, lichessUsername: true },
    });
    const { periodStart, periodEnd } = getCurrentPeriod('MONTHLY');
    await chessFetchQueue.add(JOB_NAMES.FETCH_STUDENT, {
      studentProfileId,
      chessComUsername: saved?.chessComUsername ?? null,
      lichessUsername: saved?.lichessUsername ?? null,
      periodType: 'MONTHLY',
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    }, { removeOnComplete: true, removeOnFail: 50 });

    revalidatePath('/admin/leaderboard');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('Unique constraint')) {
      return { success: false, error: 'This username is already linked to another account' };
    }
    return { success: false, error: msg };
  }
}

/** Admin: unlink a student's chess account */
export async function adminUnlinkChessAccount(studentProfileId: string) {
  await requireRole([Role.ADMIN]);

  try {
    await prisma.chessAccount.delete({ where: { studentProfileId } });
    revalidatePath('/admin/leaderboard');
    return { success: true };
  } catch {
    return { success: false, error: 'No linked account found' };
  }
}

/** Admin: get chess account for a specific student */
export async function getChessAccountByStudentId(studentProfileId: string) {
  await requireRole([Role.ADMIN]);

  return prisma.chessAccount.findUnique({ where: { studentProfileId } });
}

/** Admin / Teacher: get all students with their chess account status */
export async function getAllStudentsWithChessStatus() {
  const user = await getCurrentUser();
  if (user.role !== Role.ADMIN && user.role !== Role.TEACHER) {
    return { success: false as const, error: 'Unauthorized', students: [] };
  }

  const students = await prisma.studentProfile.findMany({
    include: {
      user: { select: { name: true, email: true, profilePictureUrl: true } },
      chessAccount: true,
    },
    orderBy: { user: { name: 'asc' } },
  });

  return {
    success: true as const,
    students: students.map((s) => ({
      studentProfileId: s.id,
      name: s.user.name,
      email: s.user.email,
      profilePictureUrl: s.user.profilePictureUrl,
      legacyChessComId: s.chessComId,   // from StudentProfile (legacy)
      legacyLichessId: s.lichessId,     // from StudentProfile (legacy)
      chessAccount: s.chessAccount,     // from ChessAccount (live system)
      isLinked: !!s.chessAccount,
      hasLegacyData: !!(s.chessComId || s.lichessId),
    })),
  };
}

// ── Auto-migration from StudentProfile ─────────────────────────────────────────

/**
 * Admin: Auto-link ONE student using chessComId/lichessId from their StudentProfile.
 * No manual typing required.
 */
export async function migrateSingleStudentFromProfile(studentProfileId: string) {
  await requireRole([Role.ADMIN]);

  const profile = await prisma.studentProfile.findUnique({
    where: { id: studentProfileId },
    include: { chessAccount: true },
  });

  if (!profile) return { success: false, error: 'Student not found' };
  if (!profile.chessComId && !profile.lichessId) {
    return { success: false, error: 'No chess IDs in profile. Enter details manually.' };
  }

  try {
    await prisma.chessAccount.upsert({
      where: { studentProfileId },
      create: {
        studentProfileId,
        chessComUsername: profile.chessComId?.trim() || null,
        lichessUsername: profile.lichessId?.trim() || null,
        chessComVerified: false,
        lichessVerified: false,
      },
      update: {
        ...(profile.chessComId && !profile.chessAccount?.chessComUsername && {
          chessComUsername: profile.chessComId.trim(),
          chessComVerified: false,
        }),
        ...(profile.lichessId && !profile.chessAccount?.lichessUsername && {
          lichessUsername: profile.lichessId.trim(),
          lichessVerified: false,
        }),
      },
    });

    const saved = await prisma.chessAccount.findUnique({
      where: { studentProfileId },
      select: { chessComUsername: true, lichessUsername: true },
    });
    const { periodStart, periodEnd } = getCurrentPeriod('MONTHLY');
    await chessFetchQueue.add(JOB_NAMES.FETCH_STUDENT, {
      studentProfileId,
      chessComUsername: saved?.chessComUsername ?? null,
      lichessUsername: saved?.lichessUsername ?? null,
      periodType: 'MONTHLY',
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    }, { removeOnComplete: true, removeOnFail: 50 });

    revalidatePath('/admin/leaderboard');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

/**
 * Admin: Bulk auto-link ALL students who have chessComId/lichessId in StudentProfile
 * but no ChessAccount yet. Queues a fetch job for each after linking.
 */
export async function migrateAllChessAccountsFromProfiles() {
  await requireRole([Role.ADMIN]);

  const eligible = await prisma.studentProfile.findMany({
    where: {
      chessAccount: null,
      OR: [{ chessComId: { not: null } }, { lichessId: { not: null } }],
    },
    select: { id: true, chessComId: true, lichessId: true },
  });

  if (eligible.length === 0) {
    return { success: true, linked: 0, message: 'All eligible students are already linked.' };
  }

  const { periodStart, periodEnd } = getCurrentPeriod('MONTHLY');
  let linked = 0;
  let failed = 0;

  for (const profile of eligible) {
    try {
      await prisma.chessAccount.create({
        data: {
          studentProfileId: profile.id,
          chessComUsername: profile.chessComId?.trim() || null,
          lichessUsername: profile.lichessId?.trim() || null,
          chessComVerified: false,
          lichessVerified: false,
        },
      });

      await chessFetchQueue.add(JOB_NAMES.FETCH_STUDENT, {
        studentProfileId: profile.id,
        chessComUsername: profile.chessComId?.trim() ?? null,
        lichessUsername: profile.lichessId?.trim() ?? null,
        periodType: 'MONTHLY',
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      }, { removeOnComplete: true, removeOnFail: 50 });

      linked++;
    } catch {
      failed++;
    }
  }

  revalidatePath('/admin/leaderboard');
  return {
    success: true,
    linked,
    failed,
    message: `Linked ${linked} student(s).${failed > 0 ? ` ${failed} failed.` : ''}`,
  };
}
