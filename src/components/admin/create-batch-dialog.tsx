'use client';

import { useState, useEffect } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { createBatch } from '@/actions/batch-actions';
import { createBatchSchema, type CreateBatchInput } from '@/lib/validation/batch';
import { WEEKDAY_OPTIONS } from '@/lib/constants';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

interface CoachOption {
  id: string;
  name: string;
  email: string;
  availabilities?: { date: string; startTime: string; endTime: string }[];
}

export function CreateBatchButton({ coaches }: { coaches: CoachOption[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        New batch
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Create a batch"
        description="Set up a recurring weekly class. You can assign a coach and enroll students now or later."
        className="max-w-2xl"
      >
        <CreateBatchForm
          coaches={coaches}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Dialog>
    </>
  );
}

function CreateBatchForm({
  coaches,
  onSuccess,
}: {
  coaches: CoachOption[];
  onSuccess: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateBatchInput>({
    resolver: zodResolver(createBatchSchema),
    defaultValues: {
      name: '',
      code: '',
      meetLink: '',
      type: 'RECURRING',
      instancesCount: 10,
      startDate: '',
      payoutRate: 0,
      coachId: '',
      schedules: [{ day: 'MONDAY', startTime: '16:00', endTime: '17:00' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'schedules' });
  const selectedCoachId = useWatch({ control, name: 'coachId' });
  const selectedType = useWatch({ control, name: 'type' });
  const [prevType, setPrevType] = useState('RECURRING');

  useEffect(() => {
    if (selectedType && selectedType !== prevType) {
      if (selectedType !== 'RECURRING') {
        setValue('instancesCount', 1);
      } else {
        setValue('instancesCount', 10);
      }
      setPrevType(selectedType);
    }
  }, [selectedType, prevType, setValue]);
console.log("selectedCoachId:", selectedCoachId);
  function handleCreateMeetLink() {
    window.open('https://meet.google.com/new', '_blank');
  }

  async function onSubmit(values: CreateBatchInput) {
    setServerError(null);
    const result = await createBatch(values);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Batch name</Label>
          <Input id="name" {...register('name')} placeholder="e.g. Weekend Beginners" />
          <FieldError message={errors.name?.message} />
        </div>
        <div>
          <Label htmlFor="code">Batch code</Label>
          <Input id="code" {...register('code')} placeholder="e.g. WB-01" />
          <FieldError message={errors.code?.message} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="type">Batch Type</Label>
          <Select id="type" {...register('type')}>
            <option value="RECURRING">Recurring Class</option>
            <option value="DEMO">Demo Session (One-off)</option>
            <option value="TRIAL">Trial Session (One-off)</option>
            <option value="PTM">Parent-Teacher Meeting (PTM)</option>
            <option value="REPLACEMENT">Replacement Class (One-off)</option>
          </Select>
          <FieldError message={errors.type?.message} />
        </div>
        <div>
          <Label htmlFor="instancesCount">Number of classes to schedule (max 300)</Label>
          <Input 
            id="instancesCount" 
            type="number" 
            {...register('instancesCount', { valueAsNumber: true })} 
            placeholder="e.g. 10" 
          />
          <FieldError message={errors.instancesCount?.message} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="meetLink">Google Meet link</Label>
          <div className="flex gap-2">
            <Input id="meetLink" {...register('meetLink')} placeholder="https://meet.google.com/xxx-xxxx-xxx" />
            <Button
              type="button"
              variant="secondary"
              onClick={handleCreateMeetLink}
            >
              Get Link
            </Button>
          </div>
          <FieldError message={errors.meetLink?.message} />
        </div>
        <div>
          <Label htmlFor="payoutRate">Coach Payout (Rs. per session)</Label>
          <Input id="payoutRate" type="number" {...register('payoutRate', { valueAsNumber: true })} placeholder="e.g. 500" />
          <FieldError message={errors.payoutRate?.message} />
        </div>
      </div>

      <div>
        <Label htmlFor="startDate">Start date (optional)</Label>
        <Input id="startDate" type="date" {...register('startDate')} />
        <FieldError message={errors.startDate?.message} />
      </div>

      <div>
        <Select id="coachId" {...register('coachId')}>
          <option value="">Unassigned — assign later</option>
          {coaches.map((coach) => (
            <option key={coach.id} value={coach.id}>
              {coach.name} ({coach.email})
            </option>
          ))}
        </Select>

        {selectedCoachId && (
          (() => {
            const selectedCoach = coaches.find(c => c.id === selectedCoachId);
            if (selectedCoach && selectedCoach.availabilities && selectedCoach.availabilities.length > 0) {
              return (
                <div className="mt-3 text-sm text-slate-600 rounded-md bg-slate-50 border border-slate-100 p-3 max-h-52 overflow-y-auto">
                  <p className="mb-1 font-medium text-slate-900">Available Times:</p>
                  <ul className="space-y-1">
                    {selectedCoach.availabilities.map((slot, i) => (
                      <li key={i}>
                        {new Date(slot.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} {slot.startTime}–{slot.endTime}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }
            if (selectedCoach) {
              return (
                <div className="mt-3 text-sm text-slate-500 rounded-md bg-slate-50 border border-slate-100 p-3">
                  This coach has not set any availability.
                </div>
              );
            }
            return null;
          })()
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label className="mb-0">Weekly schedule</Label>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => append({ day: 'MONDAY', startTime: '16:00', endTime: '17:00' })}
          >
            <Plus className="h-3.5 w-3.5" />
            Add slot
          </Button>
        </div>

        <div className="max-h-52 overflow-y-auto space-y-3 pr-2">
          {fields.map((field, index) => (
            <div key={field.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor={`schedules.${index}.day`} className="text-xs">
                    Day
                  </Label>
                  <Select id={`schedules.${index}.day`} {...register(`schedules.${index}.day` as const)}>
                    {WEEKDAY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex-1">
                  <Label htmlFor={`schedules.${index}.startTime`} className="text-xs">
                    Start
                  </Label>
                  <Input
                    id={`schedules.${index}.startTime`}
                    type="time"
                    {...register(`schedules.${index}.startTime` as const)}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor={`schedules.${index}.endTime`} className="text-xs">
                    End
                  </Label>
                  <Input
                    id={`schedules.${index}.endTime`}
                    type="time"
                    {...register(`schedules.${index}.endTime` as const)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={fields.length === 1}
                  onClick={() => remove(index)}
                  aria-label="Remove slot"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <FieldError message={errors.schedules?.[index]?.endTime?.message} />
            </div>
          ))}
        </div>
        <FieldError message={errors.schedules?.message} />
      </div>

      {serverError && <Alert variant="error">{serverError}</Alert>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create batch'}
        </Button>
      </div>
    </form>
  );
}
