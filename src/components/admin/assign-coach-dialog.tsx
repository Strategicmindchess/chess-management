'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCog } from 'lucide-react';
import { assignCoach } from '@/actions/batch-actions';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

import { WEEKDAY_LABEL } from '@/lib/constants';

interface CoachOption {
  id: string;
  name: string;
  email: string;
  availabilities?: { day: string; startTime: string; endTime: string }[];
}

export function AssignCoachDialog({
  batchId,
  batchName,
  currentCoachId,
  coaches,
}: {
  batchId: string;
  batchName: string;
  currentCoachId: string | null;
  coaches: CoachOption[];
}) {
  const [open, setOpen] = useState(false);
  const [coachId, setCoachId] = useState(currentCoachId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result = await assignCoach({ batchId, coachId });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <UserCog className="h-3.5 w-3.5" />
        {currentCoachId ? 'Change coach' : 'Assign coach'}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Assign coach · ${batchName}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="coach-select">Coach</Label>
            <Select
              id="coach-select"
              value={coachId}
              onChange={(event) => setCoachId(event.target.value)}
            >
              <option value="">Unassigned</option>
              {coaches.map((coach) => (
                <option key={coach.id} value={coach.id}>
                  {coach.name} ({coach.email})
                </option>
              ))}
            </Select>
            {coachId && (
              (() => {
                const selectedCoach = coaches.find(c => c.id === coachId);
                if (selectedCoach && selectedCoach.availabilities && selectedCoach.availabilities.length > 0) {
                  return (
                    <div className="mt-3 text-sm text-slate-600 rounded-md bg-slate-50 border border-slate-100 p-3">
                      <p className="mb-1 font-medium text-slate-900">Available Times:</p>
                      <ul className="space-y-1">
                        {selectedCoach.availabilities.map((slot, i) => (
                          <li key={i}>
                            {WEEKDAY_LABEL[slot.day as keyof typeof WEEKDAY_LABEL]} {slot.startTime}–{slot.endTime}
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
          {error && <Alert variant="error">{error}</Alert>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
