"use client";

import { useState } from "react";
import { Users } from "lucide-react";
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
                  <h3 className="font-semibold text-slate-900 mb-1">{student.name}</h3>
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
