"use client";

import { useState, useTransition, useEffect } from "react";
import { Settings2 } from "lucide-react";
import { updateBatch, deleteBatch } from "@/actions/batch-actions";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { BatchType } from "@/lib/enums";
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
  const getInitialType = (t: string) => {
    if (t === "RECURRING") return "GROUP_SESSION";
    if (t === "DEMO" || t === "TRIAL") return "DEMO_SESSION";
    if (t === "REPLACEMENT") return "SUBSTITUTE_SESSION";
    return (t as BatchType) || "GROUP_SESSION";
  };

  const [type, setType] = useState<BatchType>(getInitialType(batch.type));

  useEffect(() => {
    if (open) {
      setError(null);
      setCoachId(batch.coach?.id ?? "");
      setType(getInitialType(batch.type));
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
      payoutRate: formData.get("payoutRate") ? Number(formData.get("payoutRate")) : undefined,
      coachId: coachId,
      studentIds: Array.from(selectedStudents),
      type: type,
      addInstancesCount: formData.get("addInstancesCount") ? Number(formData.get("addInstancesCount")) : 0,
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

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this batch permanently? This action cannot be undone.")) {
      setError(null);
      startTransition(async () => {
        const result = await deleteBatch(batch.id);
        if (!result.success) {
          setError(result.error || "Failed to delete batch.");
        } else {
          setOpen(false);
        }
      });
    }
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
                <Label htmlFor="name">Batch Name <span className="text-red-500 ml-0.5">*</span></Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={batch.name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Batch Code <span className="text-red-500 ml-0.5">*</span></Label>
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
                <Label htmlFor="meetLink">Google Meet Link <span className="text-red-500 ml-0.5">*</span></Label>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Batch Type</Label>
                <Select
                  id="type"
                  name="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as BatchType)}
                >
                  <option value="GROUP_SESSION">Group session</option>
                  <option value="ONE_ON_ONE_SESSION">1-1 session</option>
                  <option value="DEMO_SESSION">Demo session</option>
                  <option value="SUBSTITUTE_SESSION">Substitute session</option>
                  <option value="PTM">PTM</option>
                  <option value="MASTERCLASS">Masterclass</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="addInstancesCount">Increase class instances by (max 300)</Label>
                <Input
                  id="addInstancesCount"
                  name="addInstancesCount"
                  type="number"
                  min="0"
                  max="300"
                  defaultValue="0"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Currently: <strong className="text-slate-700">{batch.scheduledInstances} scheduled</strong>, <strong className="text-slate-700">{batch.completedInstances} completed</strong> sessions.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payoutRate">Payout Rate (Rs. per session)</Label>
              <Input
                id="payoutRate"
                name="payoutRate"
                type="number"
                min={batch.payoutRate || 0}
                // @ts-ignore
                defaultValue={batch.payoutRate || 0}
              />
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

          <div className="flex justify-between gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              disabled={isPending}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Delete Batch
            </Button>
            <div className="flex gap-3">
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
          </div>
        </form>
      </Dialog>
    </>
  );
}
