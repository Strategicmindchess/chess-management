import { prisma } from '@/lib/prisma';

/**
 * Normalizes a user's name to generate an uppercase alphanumeric slug.
 * Format: SMC-<FIRSTNAME><2-DIGIT-RANDOM> (e.g. SMC-NAMAN25, SMC-ROHAN48)
 */
export function generateCodeCandidate(fullName: string): string {
  const parts = fullName.trim().toUpperCase().split(/\s+/);
  let cleanName = (parts[0] || 'CHESSMATE').replace(/[^A-Z0-9]/g, '');
  if (cleanName.length < 3) {
    cleanName = (cleanName + 'CHESS').slice(0, 6);
  }
  if (cleanName.length > 8) {
    cleanName = cleanName.slice(0, 8);
  }
  const randomSuffix = Math.floor(10 + Math.random() * 90); // 10 to 99
  return `SMC-${cleanName}${randomSuffix}`;
}

/**
 * Gets or creates the permanent unique referral code for an eligible user.
 */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const existing = await prisma.referralCode.findUnique({
    where: { userId },
    select: { code: true },
  });

  if (existing) {
    return existing.code;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Generate unique code with retry on collision
  let attempts = 0;
  while (attempts < 5) {
    const candidate = generateCodeCandidate(user.name);
    const collision = await prisma.referralCode.findUnique({
      where: { code: candidate },
    });

    if (!collision) {
      const created = await prisma.referralCode.create({
        data: {
          userId,
          code: candidate,
        },
        select: { code: true },
      });
      return created.code;
    }
    attempts++;
  }

  // Fallback with hex timestamp if high collision
  const fallback = `SMC-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const created = await prisma.referralCode.create({
    data: {
      userId,
      code: fallback,
    },
    select: { code: true },
  });
  return created.code;
}

