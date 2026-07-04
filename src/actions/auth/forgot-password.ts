'use server';

import { prisma } from '@/lib/prisma';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validation/auth';
import { issueOtp } from '@/services/auth/otp';
import { sendPasswordResetOtpEmail } from '@/services/email/otp-email';
import { OtpPurpose } from '@/generated/prisma/client';
import type { ActionResult } from '@/lib/types';

/** Always reports success, regardless of whether the email is registered, to avoid leaking account existence. */
export async function forgotPassword(input: ForgotPasswordInput): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  if (user && user.isActive && user.passwordHash) {
    const code = await issueOtp(user.id, OtpPurpose.PASSWORD_RESET);
    await sendPasswordResetOtpEmail(user.email, user.name, code);
  }

  return { success: true };
}
