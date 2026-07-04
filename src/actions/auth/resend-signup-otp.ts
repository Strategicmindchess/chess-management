'use server';

import { prisma } from '@/lib/prisma';
import { resendOtpSchema, type ResendOtpInput } from '@/lib/validation/auth';
import { canResendOtp, issueOtp } from '@/services/auth/otp';
import { sendSignupOtpEmail } from '@/services/email/otp-email';
import { OtpPurpose } from '@/generated/prisma/client';
import type { ActionResult } from '@/lib/types';

export async function resendSignupOtp(input: ResendOtpInput): Promise<ActionResult> {
  const parsed = resendOtpSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || user.emailVerified) {
    return { success: false, error: 'No pending verification found for this email.' };
  }

  const canResend = await canResendOtp(user.id, OtpPurpose.SIGNUP_VERIFICATION);
  if (!canResend) {
    return { success: false, error: 'Please wait a moment before requesting another code.' };
  }

  const code = await issueOtp(user.id, OtpPurpose.SIGNUP_VERIFICATION);
  await sendSignupOtpEmail(user.email, user.name, code);

  return { success: true };
}
