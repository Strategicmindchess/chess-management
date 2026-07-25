'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { forgotPassword } from '@/actions/auth/forgot-password';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validation/auth';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ForgotPasswordForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setServerError(null);
    const result = await forgotPassword(values);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    router.push(`/reset-password?email=${encodeURIComponent(values.email)}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="email">Email address <span className="text-red-500 ml-0.5">*</span></Label>
        <Input id="email" type="email" {...register('email')} placeholder="you@example.com" />
        <FieldError message={errors.email?.message} />
      </div>
      {serverError && <Alert variant="error">{serverError}</Alert>}
      <Button type="submit" variant="gradient" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Sending…' : 'Send reset code'}
      </Button>
      <p className="text-center text-sm text-slate-500">
        Remembered your password?{' '}
        <a href="/login" className="font-medium text-brand-600 hover:underline">
          Sign in
        </a>
      </p>
    </form>
  );
}
