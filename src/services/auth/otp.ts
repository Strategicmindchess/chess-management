import 'server-only';
import { createHash, randomInt } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { OtpPurpose } from '@/generated/prisma/client';
import { OTP_LENGTH, OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_MS, OTP_TTL_MS } from '@/lib/constants';

export type { OtpPurpose };

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function generateNumericCode(length: number): string {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(randomInt(min, max + 1));
}

/** Invalidates any earlier unused code for this purpose and issues a fresh one. */
export async function issueOtp(userId: string, purpose: OtpPurpose): Promise<string> {
  await prisma.otpCode.updateMany({
    where: { userId, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const code = generateNumericCode(OTP_LENGTH);

  await prisma.otpCode.create({
    data: {
      userId,
      purpose,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  return code;
}

export type OtpVerificationResult =
  | 'valid'
  | 'invalid_code'
  | 'expired'
  | 'too_many_attempts'
  | 'not_found';

export async function verifyOtp(
  userId: string,
  purpose: OtpPurpose,
  submittedCode: string,
): Promise<OtpVerificationResult> {
  const otp = await prisma.otpCode.findFirst({
    where: { userId, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) return 'not_found';
  if (otp.expiresAt < new Date()) return 'expired';
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return 'too_many_attempts';

  if (otp.codeHash !== hashCode(submittedCode)) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return 'invalid_code';
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  return 'valid';
}

/** Simple per-user/purpose cooldown so "resend code" can't be spammed. */
export async function canResendOtp(userId: string, purpose: OtpPurpose): Promise<boolean> {
  const latest = await prisma.otpCode.findFirst({
    where: { userId, purpose },
    orderBy: { createdAt: 'desc' },
  });

  if (!latest) return true;
  return Date.now() - latest.createdAt.getTime() >= OTP_RESEND_COOLDOWN_MS;
}
