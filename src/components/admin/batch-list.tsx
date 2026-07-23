"use client";

import { useState, useTransition, useRef } from "react";
import { Ban, CheckCircle2, ExternalLink } from "lucide-react";
import { setBatchActiveState } from "@/actions/batch-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { WEEKDAY_LABEL } from "@/lib/constants";
import type { Weekday } from "@/lib/enums";
import { UpdateBatchDialog } from "./update-batch-dialog";
import { AttendanceViewerDialog } from "./attendance-viewer-dialog";
import { ManageSessionsDialog } from "./manage-sessions-dialog";

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
  payoutRate: number;
  startDate?: Date | string | null;
  type: string;
  totalInstances: number;
  completedInstances: number;
  scheduledInstances: number;
  cancelledInstances: number;
}

export function BatchList({
  batches,
  coaches,
  students,
  currentPage,
  totalPages,
  searchParams,
}: {
  batches: BatchItem[];
  coaches: PersonOption[];
  students: PersonOption[];
  currentPage?: number;
  totalPages?: number;
  searchParams?: Record<string, string>;
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

  const [searchValue, setSearchValue] = useState(searchParams?.query || "");

  if (batches.length === 0 && !searchParams?.query) {
    return (
      <EmptyState
        title="No batches yet"
        description="Create your first batch to start scheduling classes."
      />
    );
  }

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  return (
    <div className="flex flex-col min-h-[640px] justify-between">
      <div className="space-y-3 p-5 border-b border-slate-100">
        <div className="flex items-center gap-2 max-w-sm mb-2">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const query = formData.get("query") as string;
              const params = new URLSearchParams();
              if (query) params.set("query", query);
              window.location.href = `/admin/batches?${params.toString()}`;
            }}
            className="flex w-full gap-2"
          >
            <input
              type="text"
              name="query"
              placeholder="Search by name or code..."
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                const form = e.currentTarget.form;
                if (form) {
                  if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                  searchTimeoutRef.current = setTimeout(() => {
                    form.requestSubmit();
                  }, 500);
                }
              }}
            />
            <Button type="submit" variant="secondary">Search</Button>
          </form>
        </div>
      </div>
      <div className="overflow-y-auto divide-y divide-slate-100 pr-2 pb-4 flex-1">
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
                  <Badge variant="neutral" className="capitalize font-normal text-xs bg-slate-100 text-slate-700">
                    {(batch.type || "GROUP_SESSION").replace(/_/g, ' ').toLowerCase()}
                  </Badge>
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
              <span className="text-slate-300">•</span>
              <span>
                Classes:{" "}
                <span className="font-medium text-slate-900">
                  {batch.scheduledInstances} scheduled, {batch.completedInstances} completed
                </span>
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <UpdateBatchDialog
                batch={batch}
                coaches={coaches}
                allStudents={students}
              />
              <ManageSessionsDialog
                batchId={batch.id}
                batchName={batch.name}
              />
              <AttendanceViewerDialog
                batchId={batch.id}
                batchName={batch.name}
              />
            </div>
          </div>
        ))}
      </div>
      {currentPage && totalPages && totalPages > 1 && (
        <div className="mt-auto">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            basePath="/admin/batches"
            searchParams={searchParams}
          />
        </div>
      )}
    </div>
  );
}
