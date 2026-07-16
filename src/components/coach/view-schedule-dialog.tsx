"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarSync } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type ClassInstance = {
  id: string;
  date: Date | string;
  startTime: string;
  endTime: string;
  status: string;
};

interface ViewScheduleDialogProps {
  batchName: string;
  classInstances: ClassInstance[];
}

export function ViewScheduleDialog({ batchName, classInstances }: ViewScheduleDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button 
        variant="secondary" 
        size="sm" 
        className="w-full text-xs h-9"
        onClick={() => setOpen(true)}
      >
        <CalendarSync className="w-4 h-4 mr-2" /> View Schedule
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Upcoming Sessions - ${batchName}`}
      >
        <div className="divide-y divide-slate-100 border border-slate-100 rounded-md overflow-hidden">
          {classInstances.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500 bg-slate-50">
              No upcoming classes.
            </div>
          ) : (
            classInstances.map((instance) => (
              <div key={instance.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                <div>
                  <p className="font-medium text-slate-900 text-sm">
                    {new Date(instance.date).toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {instance.startTime} - {instance.endTime}
                  </p>
                </div>
                <Badge variant="neutral" className="text-xs">Scheduled</Badge>
              </div>
            ))
          )}
        </div>
      </Dialog>
    </>
  );
}
