'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePassword } from '@/actions/auth/change-password';
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validation/auth';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ChangePasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  async function onSubmit(values: ChangePasswordInput) {
    setServerError(null);
    setSuccess(false);
    const result = await changePassword(values);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    setSuccess(true);
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="currentPassword">Current password</Label>
        <Input id="currentPassword" type="password" {...register('currentPassword')} />
        <FieldError message={errors.currentPassword?.message} />
      </div>
      <div>
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          type="password"
          {...register('newPassword')}
          placeholder="At least 8 characters"
        />
        <FieldError message={errors.newPassword?.message} />
      </div>
      {serverError && <Alert variant="error">{serverError}</Alert>}
      {success && (
        <Alert variant="success">Password updated. Other devices have been signed out.</Alert>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Updating…' : 'Update password'}
      </Button>
    </form>
  );
}
