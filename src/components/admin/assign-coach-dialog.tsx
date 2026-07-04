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

interface CoachOption {
  id: string;
  name: string;
  email: string;
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
