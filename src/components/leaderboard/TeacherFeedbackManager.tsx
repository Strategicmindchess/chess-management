'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { CoachFeedbackForm } from './CoachFeedbackForm';
import { Search, ChevronLeft, MessageSquarePlus, CheckCircle2 } from 'lucide-react';

interface StudentData {
  studentProfileId: string;
  name: string;
}

interface TeacherFeedbackManagerProps {
  students: StudentData[];
  periodType: 'WEEKLY' | 'MONTHLY';
  periodStart: string;
  existingFeedbacks: Record<string, any>;
}

export function TeacherFeedbackManager({
  students,
  periodType,
  periodStart,
  existingFeedbacks,
}: TeacherFeedbackManagerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  
  // Keep track of local success so we can show "Done" status instantly in the list
  const [localSuccess, setLocalSuccess] = useState<Record<string, boolean>>({});

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedStudent = students.find((s) => s.studentProfileId === selectedStudentId);

  return (
    <>
      <button
        onClick={() => {
          setSearch('');
          setSelectedStudentId(null);
          setOpen(true);
        }}
        className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
      >
        <MessageSquarePlus className="w-4 h-4" />
        Feedback
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={selectedStudent ? "Submit Feedback" : "Student Feedback"}
        description={selectedStudent ? undefined : "Select a student to submit their weekly/monthly feedback"}
      >
        <div className="flex flex-col min-h-[400px]">
          {!selectedStudent ? (
            // LIST VIEW
            <div className="flex-1 flex flex-col space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[350px]">
                {filteredStudents.length === 0 ? (
                  <p className="text-center text-slate-500 py-8 text-sm">No students found.</p>
                ) : (
                  filteredStudents.map((s) => {
                    const hasExisting = !!existingFeedbacks[s.studentProfileId];
                    const isNewlyDone = !!localSuccess[s.studentProfileId];
                    const isDone = hasExisting || isNewlyDone;

                    return (
                      <div
                        key={s.studentProfileId}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white hover:border-brand-200 hover:shadow-sm transition-all"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                          {isDone ? (
                            <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium mt-0.5">
                              <CheckCircle2 className="w-3 h-3" /> Submitted
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 mt-0.5">Pending feedback</p>
                          )}
                        </div>
                        <button
                          onClick={() => setSelectedStudentId(s.studentProfileId)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                            isDone
                              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                          }`}
                        >
                          {isDone ? 'Edit' : 'Feedback'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            // FORM VIEW
            <div className="flex-1 flex flex-col">
              <button
                onClick={() => setSelectedStudentId(null)}
                className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 mb-4 self-start"
              >
                <ChevronLeft className="w-4 h-4" /> Back to list
              </button>

              <div className="flex-1">
                <CoachFeedbackForm
                  studentProfileId={selectedStudent.studentProfileId}
                  studentName={selectedStudent.name}
                  periodType={periodType}
                  periodStart={periodStart}
                  existing={existingFeedbacks[selectedStudent.studentProfileId]}
                  onSuccess={() => {
                    setLocalSuccess((prev) => ({ ...prev, [selectedStudent.studentProfileId]: true }));
                    // Auto-close form and go back to list after 1s
                    setTimeout(() => setSelectedStudentId(null), 1000);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}
