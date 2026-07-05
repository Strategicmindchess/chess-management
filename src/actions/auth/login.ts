'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { loginSchema } from '@/lib/validation/auth';
import { ROLE_HOME_PATH } from '@/lib/constants';
import { Role } from '@/lib/enums';
import { startSession } from '@/services/auth/session';
import { issueOtp } from '@/services/auth/otp';
import { sendSignupOtpEmail } from '@/services/email/otp-email';
import { OtpPurpose } from '@/generated/prisma/client';

export interface LoginActionState {
  error?: string;
}

export async function login(
  _prevState: LoginActionState | undefined,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    return { error: 'Invalid email or password.' };
  }

  if (!user.passwordHash) {
    return { error: 'This account uses Google sign-in. Use "Continue with Google" instead.' };
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    return { error: 'Invalid email or password.' };
  }

  if (!user.emailVerified && user.role !== Role.ADMIN && user.role !== Role.TEACHER) {
    const code = await issueOtp(user.id, OtpPurpose.SIGNUP_VERIFICATION);
    await sendSignupOtpEmail(user.email, user.name, code);
    redirect(`/signup?step=otp&email=${encodeURIComponent(user.email)}`);
  }

  await startSession(user.id, user.role);
  redirect(ROLE_HOME_PATH[user.role]);
}
