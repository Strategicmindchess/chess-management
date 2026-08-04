"use client";

import { useState, useTransition } from "react";
import { CheckSquare } from "lucide-react";
import { submitClassLog } from "@/actions/class-log-actions";
import { AttendanceStatus } from "@/lib/enums";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StudentOption {
  id: string;
  name: string;
}

export function MarkClassHeldDialog({
  batchId,
  batchName,
  students,
  scheduleStartTime,
  scheduleEndTime,
  lectureName,
}: {
  batchId: string;
  batchName: string;
  students: StudentOption[];
  scheduleStartTime: string;
  scheduleEndTime: string;
  lectureName?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [topicCovered, setTopicCovered] = useState(lectureName || "");
  const [durationMins, setDurationMins] = useState<number | "">(60);
  
  // Format today's date for display
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(() => {
    const initial: Record<string, AttendanceStatus> = {};
    students.forEach((s) => (initial[s.id] = AttendanceStatus.PRESENT));
    return initial;
  });

  // Check if class has finished
  const currentHour = today.getHours();
  const currentMin = today.getMinutes();
  const [endHourStr, endMinStr] = scheduleEndTime.split(':');
  const endHour = parseInt(endHourStr, 10);
  const endMin = parseInt(endMinStr, 10);
  
  // Disable if current time < end time
  const isTimeValid = currentHour > endHour || (currentHour === endHour && currentMin >= endMin);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicCovered.trim() || !durationMins) {
      setError("Please fill in all fields.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const attendanceArr = students.map((s) => ({
        studentId: s.id,
        status: attendance[s.id] || AttendanceStatus.ABSENT,
      }));

      const result = await submitClassLog({
        classInstanceId: batchId,
        topicCovered,
        durationMins: Number(durationMins),
        attendance: attendanceArr,
      });

      if (!result.success) {
        setError(result.error);
      } else {
        setOpen(false);
        // Reset form
        setTopicCovered("");
        setDurationMins(60);
        const initial: Record<string, AttendanceStatus> = {};
        students.forEach((s) => (initial[s.id] = AttendanceStatus.PRESENT));
        setAttendance(initial);
      }
    });
  };

  const toggleAttendance = (studentId: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]:
        prev[studentId] === AttendanceStatus.PRESENT
          ? AttendanceStatus.ABSENT
          : AttendanceStatus.PRESENT,
    }));
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} disabled={!isTimeValid}>
        <CheckSquare className="h-3.5 w-3.5" />
        {isTimeValid ? "Mark Class Held" : `Available after ${scheduleEndTime}`}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Log Class: ${batchName}`}
        description="Record the class details and mark student attendance to claim your payout."
        className="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <div className="p-2 bg-slate-100 rounded-md border border-slate-200 text-sm text-slate-700 font-medium">
                {dateStr}
              </div>
            </div>
            <div>
              <Label>Time</Label>
              <div className="p-2 bg-slate-100 rounded-md border border-slate-200 text-sm text-slate-700 font-medium">
                {scheduleStartTime} - {scheduleEndTime}
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min={1}
              value={durationMins}
              onChange={(e) => setDurationMins(Number(e.target.value) || "")}
              required
            />
          </div>

          <div>
            <Label htmlFor="topic">Topic Covered</Label>
            <Input
              id="topic"
              value={topicCovered}
              onChange={(e) => setTopicCovered(e.target.value)}
              placeholder="e.g., Sicilian Defense fundamentals"
              required
            />
          </div>

          <div>
            <Label className="mb-2 block">Student Attendance</Label>
            {students.length === 0 ? (
              <p className="text-sm text-slate-500">No students enrolled.</p>
            ) : (
              <div className="max-h-60 overflow-y-auto rounded-md border border-slate-200">
                <ul className="divide-y divide-slate-100">
                  {students.map((student) => (
                    <li
                      key={student.id}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-slate-700">
                        {student.name}
                      </span>
                      <Button
                        type="button"
                        variant={
                          attendance[student.id] === AttendanceStatus.PRESENT
                            ? "primary"
                            : "secondary"
                        }
                        size="sm"
                        onClick={() => toggleAttendance(student.id)}
                        className={
                          attendance[student.id] === AttendanceStatus.PRESENT
                            ? "bg-emerald-600 hover:bg-emerald-700 focus-visible:outline-emerald-600"
                            : "text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                        }
                      >
                        {attendance[student.id] === AttendanceStatus.PRESENT
                          ? "Present"
                          : "Absent"}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {error && <Alert variant="error">{error}</Alert>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Submitting…" : "Submit Log"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
