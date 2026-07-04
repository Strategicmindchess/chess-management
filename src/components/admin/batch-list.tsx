"use client";

import { useState, useTransition } from "react";
import { Ban, CheckCircle2, ExternalLink } from "lucide-react";
import { setBatchActiveState } from "@/actions/batch-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { WEEKDAY_LABEL } from "@/lib/constants";
import type { Weekday } from "@/lib/enums";
import { AssignCoachDialog } from "./assign-coach-dialog";
import { ManageStudentsDialog } from "./manage-students-dialog";

interface PersonOption {
  id: string;
  name: string;
  email: string;
}

interface ScheduleItem {
  id: string;
  day: Weekday;
  startTime: string;
  endTime: string;
}

export interface BatchItem {
  id: string;
  name: string;
  code: string;
  meetLink: string;
  isActive: boolean;
  coach: PersonOption | null;
  schedules: ScheduleItem[];
  students: PersonOption[];
}

export function BatchList({
  batches,
  coaches,
  students,
}: {
  batches: BatchItem[];
  coaches: PersonOption[];
  students: PersonOption[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggleActive(batchId: string, nextActive: boolean) {
    setError(null);
    setPendingId(batchId);
    startTransition(async () => {
      const result = await setBatchActiveState(batchId, nextActive);
      if (!result.success) setError(result.error);
      setPendingId(null);
    });
  }

  if (batches.length === 0) {
    return (
      <EmptyState
        title="No batches yet"
        description="Create your first batch to start scheduling classes."
      />
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {error && <p className="px-5 py-3 text-sm text-rose-600">{error}</p>}
      {batches.map((batch) => (
        <div key={batch.id} className="space-y-3 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  {batch.name}
                </h3>
                <Badge variant="neutral">{batch.code}</Badge>
                <Badge variant={batch.isActive ? "success" : "neutral"}>
                  {batch.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <a
                href={batch.meetLink}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
              >
                Meet link <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <Button
              variant={batch.isActive ? "secondary" : "primary"}
              size="sm"
              disabled={isPending && pendingId === batch.id}
              onClick={() => handleToggleActive(batch.id, !batch.isActive)}
            >
              {batch.isActive ? (
                <Ban className="h-3.5 w-3.5" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              {batch.isActive ? "Deactivate" : "Activate"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {batch.schedules.map((slot) => (
              <Badge key={slot.id} variant="brand">
                {WEEKDAY_LABEL[slot.day].slice(0, 3)} {slot.startTime}–
                {slot.endTime}
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span>
              Coach:{" "}
              <span className="font-medium text-slate-900">
                {batch.coach ? batch.coach.name : "Unassigned"}
              </span>
            </span>
            <span className="text-slate-300">•</span>
            <span>{batch.students.length} student(s) enrolled</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <AssignCoachDialog
              batchId={batch.id}
              batchName={batch.name}
              currentCoachId={batch.coach?.id ?? null}
              coaches={coaches}
            />
            <ManageStudentsDialog
              batchId={batch.id}
              batchName={batch.name}
              enrolledStudents={batch.students}
              allStudents={students}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
