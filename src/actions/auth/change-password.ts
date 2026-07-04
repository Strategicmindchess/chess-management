'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/dal';
import { hashPassword, verifyPassword } from '@/lib/password';
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validation/auth';
import { invalidateOtherSessionsAndRestart } from '@/services/auth/session';
import type { ActionResult } from '@/lib/types';

export async function changePassword(input: ChangePasswordInput): Promise<ActionResult> {
  const currentUser = await getCurrentUser();

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: currentUser.id } });

  if (user.passwordHash) {
    const isCurrentPasswordValid = await verifyPassword(
      parsed.data.currentPassword,
      user.passwordHash,
    );
    if (!isCurrentPasswordValid) {
      return { success: false, error: 'Current password is incorrect.' };
    }
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  await invalidateOtherSessionsAndRestart(user.id, user.role);
  return { success: true };
}
