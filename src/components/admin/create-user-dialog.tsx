'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createStaffUser } from '@/actions/user-actions';
import { createStaffUserSchema, type CreateStaffUserInput } from '@/lib/validation/user';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

export function CreateUserButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        New account
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Create a coach or student account"
        description="They can sign in immediately with the password you set below."
      >
        <CreateUserForm
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Dialog>
    </>
  );
}

function CreateUserForm({ onSuccess }: { onSuccess: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateStaffUserInput>({
    resolver: zodResolver(createStaffUserSchema),
    defaultValues: { name: '', email: '', phone: '', password: '', role: 'STUDENT' },
  });

  async function onSubmit(values: CreateStaffUserInput) {
    setServerError(null);
    const result = await createStaffUser(values);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="role">Role</Label>
        <Select id="role" {...register('role')}>
          <option value="STUDENT">Student</option>
          <option value="TEACHER">Coach</option>
        </Select>
        <FieldError message={errors.role?.message} />
      </div>
      <div>
        <Label htmlFor="name">Full name</Label>
        <Input id="name" {...register('name')} placeholder="e.g. Aditi Sharma" />
        <FieldError message={errors.name?.message} />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} placeholder="name@example.com" />
        <FieldError message={errors.email?.message} />
      </div>
      <div>
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input id="phone" {...register('phone')} placeholder="98765 43210" />
        <FieldError message={errors.phone?.message} />
      </div>
      <div>
        <Label htmlFor="password">Temporary password</Label>
        <Input
          id="password"
          type="password"
          {...register('password')}
          placeholder="At least 8 characters"
        />
        <FieldError message={errors.password?.message} />
      </div>
      {serverError && <Alert variant="error">{serverError}</Alert>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create account'}
        </Button>
      </div>
    </form>
  );
}
