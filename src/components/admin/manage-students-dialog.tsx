'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, X } from 'lucide-react';
import { enrollStudents, unenrollStudent } from '@/actions/batch-actions';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';

interface StudentOption {
  id: string;
  name: string;
  email: string;
}

export function ManageStudentsDialog({
  batchId,
  batchName,
  enrolledStudents,
  allStudents,
}: {
  batchId: string;
  batchName: string;
  enrolledStudents: StudentOption[];
  allStudents: StudentOption[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const router = useRouter();

  const enrolledIds = useMemo(
    () => new Set(enrolledStudents.map((student) => student.id)),
    [enrolledStudents],
  );
  const availableStudents = useMemo(
    () => allStudents.filter((student) => !enrolledIds.has(student.id)),
    [allStudents, enrolledIds],
  );

  function toggleSelected(studentId: string) {
    setSelectedIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  }

  async function handleEnroll() {
    if (selectedIds.length === 0) return;
    setError(null);
    setIsSubmitting(true);
    const result = await enrollStudents({ batchId, studentIds: selectedIds });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setSelectedIds([]);
    router.refresh();
  }

  async function handleRemove(studentId: string) {
    setError(null);
    setRemovingId(studentId);
    const result = await unenrollStudent({ batchId, studentId });
    setRemovingId(null);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.refresh();
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Users className="h-3.5 w-3.5" />
        Manage students ({enrolledStudents.length})
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Students · ${batchName}`}
        className="max-w-xl"
      >
        <div className="space-y-5">
          {error && <Alert variant="error">{error}</Alert>}

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              Enrolled ({enrolledStudents.length})
            </p>
            {enrolledStudents.length === 0 ? (
              <p className="text-sm text-slate-500">No students enrolled yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {enrolledStudents.map((student) => (
                  <li
                    key={student.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{student.name}</p>
                      <p className="text-xs text-slate-500">{student.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(student.id)}
                      disabled={removingId === student.id}
                      className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Remove ${student.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Add students</p>
            {availableStudents.length === 0 ? (
              <EmptyState
                title="No more students to add"
                description="Every active student is already enrolled."
              />
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {availableStudents.map((student) => (
                  <label
                    key={student.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
                  >
                    <Checkbox
                      checked={selectedIds.includes(student.id)}
                      onChange={() => toggleSelected(student.id)}
                    />
                    <span className="font-medium text-slate-900">{student.name}</span>
                    <span className="text-xs text-slate-500">{student.email}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                size="sm"
                disabled={selectedIds.length === 0 || isSubmitting}
                onClick={handleEnroll}
              >
                {isSubmitting
                  ? 'Enrolling…'
                  : `Enroll ${selectedIds.length || ''} selected`.trim()}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}
