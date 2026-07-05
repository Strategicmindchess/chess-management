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
}: {
  batchId: string;
  batchName: string;
  students: StudentOption[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [topicCovered, setTopicCovered] = useState("");
  const [durationMins, setDurationMins] = useState<number | "">("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16)); // YYYY-MM-DDThh:mm
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(() => {
    const initial: Record<string, AttendanceStatus> = {};
    students.forEach((s) => (initial[s.id] = AttendanceStatus.PRESENT));
    return initial;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicCovered.trim() || !durationMins || !date) {
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
        batchId,
        topicCovered,
        durationMins: Number(durationMins),
        date: new Date(date).toISOString(),
        attendance: attendanceArr,
      });

      if (!result.success) {
        setError(result.error);
      } else {
        setOpen(false);
        // Reset form
        setTopicCovered("");
        setDurationMins("");
        setDate(new Date().toISOString().slice(0, 16));
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
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <CheckSquare className="h-3.5 w-3.5" />
        Mark Class Held
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
              <Label htmlFor="date">Date & Time</Label>
              <Input
                id="date"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
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
