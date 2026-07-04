'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { ROLE_HOME_PATH } from '@/lib/constants';
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validation/auth';
import { verifyOtp } from '@/services/auth/otp';
import { invalidateOtherSessionsAndRestart } from '@/services/auth/session';
import { OtpPurpose } from '@/generated/prisma/client';

const OTP_ERROR_MESSAGES: Record<string, string> = {
  not_found: 'No password reset was requested for this email.',
  expired: 'This code has expired. Request a new one.',
  too_many_attempts: 'Too many incorrect attempts. Request a new code.',
  invalid_code: 'That code is incorrect.',
};

export async function resetPassword(
  input: ResetPasswordInput,
): Promise<{ error: string } | undefined> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { email, code, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return { error: OTP_ERROR_MESSAGES.not_found };
  }

  const result = await verifyOtp(user.id, OtpPurpose.PASSWORD_RESET, code);
  if (result !== 'valid') {
    return { error: OTP_ERROR_MESSAGES[result] };
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, emailVerified: true },
  });

  await invalidateOtherSessionsAndRestart(user.id, user.role);
  redirect(ROLE_HOME_PATH[user.role]);
}
