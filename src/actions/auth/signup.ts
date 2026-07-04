'use server';

import { prisma } from '@/lib/prisma';
import { Role } from '@/lib/enums';
import { hashPassword } from '@/lib/password';
import { signupSchema, type SignupInput } from '@/lib/validation/auth';
import { issueOtp } from '@/services/auth/otp';
import { sendSignupOtpEmail } from '@/services/email/otp-email';
import { OtpPurpose } from '@/generated/prisma/client';

export type SignupResult = { success: true; email: string } | { success: false; error: string };

/**
 * Self-signup is Student-only — Coach and Admin accounts are created by an
 * Admin. The account starts unverified; `verifySignupOtp` finishes
 * activation. Retrying a signup for an email that already started (but never
 * verified) just resends a fresh code instead of erroring.
 */
export async function signup(input: SignupInput): Promise<SignupResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing?.emailVerified) {
    return {
      success: false,
      error: 'An account with this email already exists. Please log in instead.',
    };
  }

  const passwordHash = await hashPassword(password);

  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: { name, passwordHash } })
    : await prisma.user.create({
        data: { name, email, passwordHash, role: Role.STUDENT, emailVerified: false },
      });

  const code = await issueOtp(user.id, OtpPurpose.SIGNUP_VERIFICATION);
  await sendSignupOtpEmail(user.email, user.name, code);

  return { success: true, email: user.email };
}
