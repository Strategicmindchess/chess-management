'use client';

import { ExternalLink, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { JoinClassButton } from '@/components/student/join-class-button';
import { StartBatchButton } from '@/components/coach/start-batch-button';
import { ViewStudentsDialog } from '@/components/coach/view-students-dialog';
import { format } from 'date-fns';

type StudentDetail = {
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
  };
};

type ClassSessionCardProps = {
  role: 'teacher' | 'student';
  session: any; // We'll type this appropriately
  isUpcoming?: boolean;
};

export function ClassSessionCard({ role, session, isUpcoming = false }: ClassSessionCardProps) {
  const { batch, date, startTime, endTime, lectureName } = session;
  
  // Format students for ViewStudentsDialog (Teacher only)
  const students: StudentDetail[] = batch.students?.map((s: any) => ({
    id: s.student.id,
    name: s.student.user.name,
    email: s.student.user.email,
    studentProfile: {
      chessComId: s.student.chessComId,
      lichessId: s.student.lichessId,
      chessComRating: s.student.chessComRating,
      lichessRating: s.student.lichessRating,
      city: s.student.city,
      parentName: s.student.parentName,
    },
  })) || [];

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4 flex justify-between items-start shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white">{batch.name}</h2>
          {role === 'student' && batch.coach && (
            <p className="text-slate-300 text-sm mt-0.5">
              Coach: <span className="font-semibold text-white">{batch.coach.user.name}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {session.status === 'CANCELLED' && (
            <Badge variant="danger" className="shrink-0 bg-red-500/90 hover:bg-red-500">
              Cancelled
            </Badge>
          )}
          <Badge variant="neutral" className="bg-white/20 text-white hover:bg-white/30 border-none shrink-0 ml-2">
            {batch.code}
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-0 flex flex-col flex-grow">
        <div className="p-5 flex-grow space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-slate-100 text-slate-700 p-2 rounded-lg">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-slate-900">
                {format(new Date(date), 'EEEE, MMM do, yyyy')}
              </p>
              {lectureName && (
                <p className="text-sm font-semibold text-brand-700 mt-0.5">
                  📖 {lectureName}
                </p>
              )}
              <p className="text-sm text-slate-500 flex items-center mt-1">
                <Clock className="w-4 h-4 mr-1.5" />
                {startTime} - {endTime}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 mt-auto space-y-3 shrink-0">
          {role === 'teacher' ? (
            <>
              {session.status === 'CANCELLED' ? (
                <div title="This class was cancelled" className="w-full text-center py-2 px-3 text-sm font-semibold text-red-500 bg-red-50 rounded-md cursor-not-allowed border border-red-100">
                  Class Cancelled
                </div>
              ) : isUpcoming ? (
                <div title="Class not yet open" className="w-full text-center py-2 px-3 text-sm font-semibold text-slate-400 bg-slate-100 rounded-md cursor-not-allowed">
                  Start Batch (Opens later)
                </div>
              ) : (
                <StartBatchButton meetLink={batch.meetLink} batchName={batch.name} />
              )}
              
              <div className="w-full">
                <ViewStudentsDialog 
                  batchName={batch.name}
                  students={students}
                />
              </div>
            </>
          ) : (
            <div className="flex justify-end">
              {session.status === 'CANCELLED' ? (
                <span title="This class was cancelled" className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-500 bg-red-50 border border-red-100 px-3 py-1.5 rounded-md cursor-not-allowed">
                  Cancelled
                </span>
              ) : isUpcoming ? (
                <span title="Class not yet open" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-md cursor-not-allowed">
                  Join Class <ExternalLink className="h-3.5 w-3.5" />
                </span>
              ) : (
                <JoinClassButton 
                  meetLink={batch.meetLink} 
                  nextInstance={session} 
                />
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
