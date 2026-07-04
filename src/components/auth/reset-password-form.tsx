'use client';

import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { resetPassword } from '@/actions/auth/reset-password';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OtpInput } from './otp-input';

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result = await resetPassword({ email, code, password });
    setIsSubmitting(false);
    if (result?.error) setError(result.error);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>
      <div>
        <Label>6-digit code</Label>
        <OtpInput value={code} onChange={setCode} disabled={isSubmitting} />
      </div>
      <div>
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
          required
        />
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      <Button
        type="submit"
        variant="gradient"
        className="w-full"
        disabled={isSubmitting || code.length !== 6}
      >
        {isSubmitting ? 'Resetting…' : 'Reset password'}
      </Button>
    </form>
  );
}
