"use client";

import { useState } from "react";
import { Users, Gift, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

type StudentDetails = {
  id: string;
  name: string;
  email: string;
  studentProfile: {
    chessComId: string | null;
    lichessId: string | null;
    chessComRating: number | null;
    lichessRating: number | null;
    city: string | null;
    parentName: string | null;
  } | null;
};

interface ViewStudentsDialogProps {
  batchName: string;
  students: StudentDetails[];
}

function AwardChocolateButton({ studentProfileId, studentName }: { studentProfileId: string; studentName: string }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAward = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teacher/chocolate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentProfileId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 flex items-center gap-1">
        <Gift className="w-3.5 h-3.5" /> Awarded!
      </span>
    );
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleAward}
      disabled={loading}
      className="h-7 text-xs bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200"
      title={`Award a chocolate point to ${studentName}`}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Gift className="w-3.5 h-3.5 mr-1" />}
      Award 🍫
    </Button>
  );
}

export function ViewStudentsDialog({ batchName, students }: ViewStudentsDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" size="sm" className="w-full text-xs" onClick={() => setOpen(true)}>
        <Users className="mr-1 h-3.5 w-3.5" />
        View Students
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Students in ${batchName}`}
        description="Detailed information for enrolled students."
        className="max-w-2xl"
      >
        <div className="space-y-4 pr-2 max-h-[500px] overflow-y-auto">
          {students.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No students enrolled.</p>
          ) : (
            <div className="grid gap-4">
              {students.map((student) => (
                <div key={student.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-900">{student.name}</h3>
                    <AwardChocolateButton studentProfileId={student.id} studentName={student.name} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-600">
                    <div>
                      <span className="font-medium">Email:</span> {student.email}
                    </div>
                    {student.studentProfile?.parentName && (
                      <div>
                        <span className="font-medium">Parent:</span> {student.studentProfile.parentName}
                      </div>
                    )}
                    {student.studentProfile?.city && (
                      <div>
                        <span className="font-medium">City:</span> {student.studentProfile.city}
                      </div>
                    )}
                    {(student.studentProfile?.chessComRating || student.studentProfile?.lichessRating) && (
                      <div className="flex gap-4">
                        <div>
                          <span className="font-medium">Chess.com:</span> {student.studentProfile.chessComRating ?? "N/A"}
                        </div>
                        <div>
                          <span className="font-medium">Lichess:</span> {student.studentProfile.lichessRating ?? "N/A"}
                        </div>
                      </div>
                    )}
                    {student.studentProfile?.chessComId && (
                      <div>
                        <span className="font-medium">Chess.com:</span> {student.studentProfile.chessComId}
                      </div>
                    )}
                    {student.studentProfile?.lichessId && (
                      <div>
                        <span className="font-medium">Lichess:</span> {student.studentProfile.lichessId}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button onClick={() => setOpen(false)}>Close</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

