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

  let user;
  try {
    user = await prisma.user.findUnique({ where: { email } });
  } catch (error) {
    console.error("Login DB Error:", error);
    return { error: 'Service temporarily unavailable. Please try again.' };
  }

  if (!user || !user.isActive) {
    return { error: 'Invalid email or password.' };
  }

  if (!user.passwordHash) {
    return { error: 'This account uses Google sign-in. Use "Continue with Google" instead.' };
  }

  let isValidPassword;
  try {
    isValidPassword = await verifyPassword(password, user.passwordHash);
  } catch (error) {
    console.error("Password verify error:", error);
    return { error: 'Service temporarily unavailable.' };
  }

  if (!isValidPassword) {
    return { error: 'Invalid email or password.' };
  }

  if (!user.emailVerified && user.role !== Role.ADMIN && user.role !== Role.TEACHER) {
    try {
      const code = await issueOtp(user.id, OtpPurpose.SIGNUP_VERIFICATION);
      await sendSignupOtpEmail(user.email, user.name, code);
    } catch (error) {
      console.error("OTP issue error:", error);
      return { error: 'Could not send verification code. Please try again.' };
    }
    redirect(`/signup?step=otp&email=${encodeURIComponent(user.email)}`);
  }

  try {
    await startSession(user.id, user.role);
  } catch (error) {
    console.error("Session start error:", error);
    return { error: 'Could not start session. Please try again.' };
  }
  redirect(ROLE_HOME_PATH[user.role]);
}
