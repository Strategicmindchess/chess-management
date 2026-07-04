'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ROLE_HOME_PATH } from '@/lib/constants';
import { verifyOtpSchema, type VerifyOtpInput } from '@/lib/validation/auth';
import { verifyOtp } from '@/services/auth/otp';
import { startSession } from '@/services/auth/session';
import { OtpPurpose } from '@/generated/prisma/client';

const OTP_ERROR_MESSAGES: Record<string, string> = {
  not_found: 'No pending verification found for this email. Please sign up again.',
  expired: 'This code has expired. Request a new one.',
  too_many_attempts: 'Too many incorrect attempts. Request a new code.',
  invalid_code: 'That code is incorrect.',
};

export async function verifySignupOtp(input: VerifyOtpInput): Promise<{ error: string } | undefined> {
  const parsed = verifyOtpSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { email, code } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return { error: OTP_ERROR_MESSAGES.not_found };
  }

  const result = await verifyOtp(user.id, OtpPurpose.SIGNUP_VERIFICATION, code);
  if (result !== 'valid') {
    return { error: OTP_ERROR_MESSAGES[result] };
  }

  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
  await startSession(user.id, user.role);

  redirect(ROLE_HOME_PATH[user.role]);
}
