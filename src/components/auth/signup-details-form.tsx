'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signup } from '@/actions/auth/signup';
import { signupSchema, type SignupInput } from '@/lib/validation/auth';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { GoogleButton } from './google-button';

export function SignupDetailsForm({
  onVerificationRequired,
}: {
  onVerificationRequired: (email: string) => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  async function onSubmit(values: SignupInput) {
    setServerError(null);
    const result = await signup(values);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    onVerificationRequired(result.email);
  }

  return (
    <div className="space-y-5">
      <GoogleButton />
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <div className="h-px flex-1 bg-slate-200" />
        or
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" {...register('name')} placeholder="Your name" />
          <FieldError message={errors.name?.message} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register('email')} placeholder="you@example.com" />
          <FieldError message={errors.email?.message} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            {...register('password')}
            placeholder="At least 8 characters"
          />
          <FieldError message={errors.password?.message} />
        </div>
        {serverError && <Alert variant="error">{serverError}</Alert>}
        <Button type="submit" variant="gradient" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Sign up'}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500">
        Already a member?{' '}
        <a href="/login" className="font-medium text-brand-600 hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
}
