"use client";

import { useState, useTransition, useEffect } from "react";
import { Settings2 } from "lucide-react";
import { updateBatch } from "@/actions/batch-actions";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { BatchItem } from "./batch-list";

interface PersonOption {
  id: string;
  name: string;
  email: string;
}

export function UpdateBatchDialog({
  batch,
  coaches,
  allStudents,
}: {
  batch: BatchItem;
  coaches: PersonOption[];
  allStudents: PersonOption[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // State for the coach and students to manage them in the form
  const [coachId, setCoachId] = useState(batch.coach?.id ?? "");
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(
    new Set(batch.students.map((s) => s.id))
  );

  useEffect(() => {
    if (open) {
      setError(null);
      setCoachId(batch.coach?.id ?? "");
      setSelectedStudents(new Set(batch.students.map((s) => s.id)));
    }
  }, [open, batch]);

  const toggleStudent = (studentId: string) => {
    const next = new Set(selectedStudents);
    if (next.has(studentId)) {
      next.delete(studentId);
    } else {
      next.add(studentId);
    }
    setSelectedStudents(next);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    
    // We construct the object expected by updateBatch schema
    const payload = {
      batchId: batch.id,
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      meetLink: formData.get("meetLink") as string,
      startDate: formData.get("startDate") as string,
      coachId: coachId,
      studentIds: Array.from(selectedStudents),
    };

    startTransition(async () => {
      const result = await updateBatch(payload);
      if (result.success) {
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Settings2 className="h-3.5 w-3.5" />
        Update
      </Button>
      
      <Dialog open={open} onClose={() => setOpen(false)} title={`Update Batch: ${batch.name}`}>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-900 border-b pb-2">Batch Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Batch Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={batch.name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Batch Code</Label>
                <Input
                  id="code"
                  name="code"
                  defaultValue={batch.code}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meetLink">Google Meet Link</Label>
                <Input
                  id="meetLink"
                  name="meetLink"
                  type="url"
                  defaultValue={batch.meetLink}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  // @ts-ignore
                  defaultValue={batch.startDate ? new Date(batch.startDate).toISOString().split('T')[0] : ""}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-medium text-slate-900 border-b pb-2">Assign Coach</h3>
            <div className="space-y-2">
              <Select
                value={coachId}
                onChange={(e) => setCoachId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {coaches.map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coach.name} ({coach.email})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-medium text-slate-900 border-b pb-2">
              Manage Students ({selectedStudents.size} selected)
            </h3>
            
            <div className="max-h-[200px] overflow-y-auto rounded-md border border-slate-200 divide-y divide-slate-100">
              {allStudents.map((student) => {
                const isSelected = selectedStudents.has(student.id);
                return (
                  <div 
                    key={student.id} 
                    className={`flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer transition-colors ${isSelected ? 'bg-brand-50 hover:bg-brand-50' : ''}`}
                    onClick={() => toggleStudent(student.id)}
                  >
                    <div>
                      <p className={`text-sm font-medium ${isSelected ? 'text-brand-900' : 'text-slate-900'}`}>{student.name}</p>
                      <p className={`text-xs ${isSelected ? 'text-brand-700' : 'text-slate-500'}`}>{student.email}</p>
                    </div>
                    <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300'}`}>
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
              {allStudents.length === 0 && (
                <div className="p-4 text-center text-sm text-slate-500">
                  No students available.
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} variant="primary">
              {isPending ? "Saving..." : "Save Batch"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
