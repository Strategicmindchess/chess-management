'use client';

import { useState } from 'react';
import { verifySignupOtp } from '@/actions/auth/verify-signup-otp';
import { resendSignupOtp } from '@/actions/auth/resend-signup-otp';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { OtpInput } from './otp-input';

export function SignupOtpForm({ email, onBack }: { email: string; onBack: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  async function handleVerify() {
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    const result = await verifySignupOtp({ email, code });
    setIsSubmitting(false);
    // On success the server action redirects, so there is nothing else to do here.
    if (result?.error) setError(result.error);
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    setIsResending(true);
    const result = await resendSignupOtp({ email });
    setIsResending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setNotice('A new code has been sent to your email.');
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        We sent a 6-digit code to <span className="font-medium text-slate-900">{email}</span>.
      </p>

      <OtpInput value={code} onChange={setCode} disabled={isSubmitting} />

      {error && <Alert variant="error">{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}

      <Button
        type="button"
        variant="gradient"
        className="w-full"
        disabled={code.length !== 6 || isSubmitting}
        onClick={handleVerify}
      >
        {isSubmitting ? 'Verifying…' : 'Verify email'}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={onBack} className="text-slate-500 hover:underline">
          Back
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={isResending}
          className="font-medium text-brand-600 hover:underline disabled:opacity-50"
        >
          {isResending ? 'Sending…' : 'Resend code'}
        </button>
      </div>
    </div>
  );
}
