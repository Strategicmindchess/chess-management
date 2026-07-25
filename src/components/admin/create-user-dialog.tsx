'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createStaffUser } from '@/actions/user-actions';
import { createStaffUserSchema, type CreateStaffUserInput } from '@/lib/validation/user';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
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
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createStaffUserSchema),
    defaultValues: { name: '', email: '', phone: '', password: '', role: 'STUDENT' },
  });

  const role = useWatch({ control, name: 'role' });

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
        <Label htmlFor="role">Role <span className="text-red-500 ml-0.5">*</span></Label>
        <Select id="role" {...register('role')}>
          <option value="STUDENT">Student</option>
          <option value="TEACHER">Coach</option>
        </Select>
        <FieldError message={errors.role?.message} />
      </div>
      <div>
        <Label htmlFor="name">Full name <span className="text-red-500 ml-0.5">*</span></Label>
        <Input id="name" {...register('name')} placeholder="e.g. Aditi Sharma" />
        <FieldError message={errors.name?.message} />
      </div>
      <div>
        <Label htmlFor="email">Email <span className="text-red-500 ml-0.5">*</span></Label>
        <Input id="email" type="email" {...register('email')} placeholder="name@example.com" />
        <FieldError message={errors.email?.message} />
      </div>
      <div>
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input id="phone" {...register('phone')} placeholder="98765 43210" />
        <FieldError message={errors.phone?.message} />
      </div>
      <div>
        <Label htmlFor="password">Temporary password <span className="text-red-500 ml-0.5">*</span></Label>
        <PasswordInput
          id="password"
          {...register('password')}
          placeholder="At least 8 characters"
        />
        <FieldError message={errors.password?.message} />
      </div>

      {role === 'STUDENT' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="parentName">Parent Name</Label>
              <Input id="parentName" {...register('parentName')} placeholder="e.g. Ramesh Sharma" />
              <FieldError message={errors.parentName?.message} />
            </div>
            <div>
              <Label htmlFor="parentPhone">Parent Phone</Label>
              <Input id="parentPhone" {...register('parentPhone')} placeholder="98765 43210" />
              <FieldError message={errors.parentPhone?.message} />
            </div>
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" {...register('city')} placeholder="e.g. Jhansi" />
            <FieldError message={errors.city?.message} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="chessComId">Chess.com ID</Label>
              <Input id="chessComId" {...register('chessComId')} placeholder="username" />
              <FieldError message={errors.chessComId?.message} />
            </div>
            <div>
              <Label htmlFor="lichessId">Lichess ID</Label>
              <Input id="lichessId" {...register('lichessId')} placeholder="username" />
              <FieldError message={errors.lichessId?.message} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="chessComRating">Chess.com Rating</Label>
              <Input id="chessComRating" type="number" {...register('chessComRating')} placeholder="1200" />
              <FieldError message={errors.chessComRating?.message} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lichessRating">Lichess Rating</Label>
              <Input id="lichessRating" type="number" {...register('lichessRating')} placeholder="1500" />
              <FieldError message={errors.lichessRating?.message} />
            </div>
          </div>
        </>
      )}
      {serverError && <Alert variant="error">{serverError}</Alert>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create account'}
        </Button>
      </div>
    </form>
  );
}
