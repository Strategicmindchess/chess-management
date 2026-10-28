"use client";

import { useState, useTransition } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addDays, getDay, isBefore, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Clock, Trash2, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { addAvailabilitySlots, deleteAvailabilitySlot } from "@/actions/availability-actions";

type AvailabilitySlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
};

export function AvailabilityManager({
  initialAvailabilities,
}: {
  initialAvailabilities: AvailabilitySlot[];
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availabilities, setAvailabilities] = useState<AvailabilitySlot[]>(initialAvailabilities);
  const today = startOfDay(new Date());
  
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [applyWholeWeek, setApplyWholeWeek] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Calendar logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Pad beginning of month
  const startDay = getDay(monthStart); // 0 = Sunday
  const paddingDays = Array.from({ length: startDay }).map((_, i) => i);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime) {
      setError("Please select start and end times.");
      return;
    }
    
    if (startTime >= endTime) {
      setError("End time must be after start time.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const datesToApply = [selectedDate];
      if (applyWholeWeek) {
        for (let i = 1; i < 7; i++) {
          datesToApply.push(addDays(selectedDate, i));
        }
      }

      const slotsToAdd = datesToApply.map(d => ({
        date: d.toISOString(),
        startTime,
        endTime
      }));

      const result = await addAvailabilitySlots(slotsToAdd);
      
      if (!result.success) {
        setError(result.error);
      } else {
        // Simple client-side refresh would be ideal, but for now we'll just reload the page to get fresh IDs
        window.location.reload();
      }
    });
  };

  const handleDeleteSlot = (id: string) => {
    startTransition(async () => {
      const result = await deleteAvailabilitySlot(id);
      if (result.success) {
        setAvailabilities(prev => prev.filter(a => a.id !== id));
      } else {
        setError(result.error);
      }
    });
  };

  // Filter slots for selected date
  const selectedDateSlots = availabilities.filter(a => 
    isSameDay(new Date(a.date), selectedDate)
  );

  return (
    <div className="flex flex-col md:flex-row min-h-[600px]">
      {/* Calendar Pane */}
      <div className="w-full md:w-[380px] border-r border-slate-200/90 dark:border-slate-700/50 bg-slate-50/70 dark:bg-[#111723]/30 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2 text-brand-600 dark:text-brand-500" />
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer" onClick={handlePrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer" onClick={handleNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {paddingDays.map((_, i) => (
            <div key={`empty-${i}`} className="h-10 w-10" />
          ))}
          {daysInMonth.map((date: Date) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, new Date());
            const hasSlots = availabilities.some(a => isSameDay(new Date(a.date), date));
            const isPast = isBefore(startOfDay(date), today);

            return (
              <button
                key={date.toISOString()}
                onClick={() => !isPast && setSelectedDate(date)}
                disabled={isPast}
                title={isPast ? "Past date" : format(date, "EEEE, MMMM do")}
                className={`
                  relative h-10 w-10 rounded-full flex items-center justify-center text-sm transition-all
                  ${isPast
                    ? "text-slate-400/40 dark:text-slate-600 cursor-not-allowed opacity-40"
                    : isSelected
                    ? "bg-brand-600 text-white font-semibold shadow-sm"
                    : isToday
                    ? "bg-brand-50 text-brand-700 border border-brand-200 dark:bg-brand-500/20 dark:text-brand-400 dark:border-transparent font-bold hover:bg-brand-100 dark:hover:bg-brand-500/30"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer font-medium"
                  }
                `}
              >
                {format(date, "d")}
                {hasSlots && !isSelected && !isPast && (
                  <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-brand-600 dark:bg-brand-500" />
                )}
                {hasSlots && isSelected && (
                  <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor Pane */}
      <div className="flex-1 p-6 bg-white dark:bg-transparent">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
          {format(selectedDate, "EEEE, MMMM do, yyyy")}
        </h3>
        {isBefore(startOfDay(selectedDate), today) ? (
          <p className="text-sm text-amber-700 dark:text-amber-400/80 mb-6 flex items-center gap-1.5 font-medium">
            <span>⚠️</span> This is a past date — availability cannot be edited.
          </p>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Manage your availability for this date.</p>
        )}

        <div className="space-y-6 max-w-md">
          {/* Add Slot Form — only show for today or future */}
          {!isBefore(startOfDay(selectedDate), today) && (
          <form onSubmit={handleAddSlot} className="bg-slate-50/80 dark:bg-[#111723]/50 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-700/50 space-y-4 shadow-xs">
            <h4 className="font-semibold text-slate-900 dark:text-white">Add Time Slot</h4>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label htmlFor="startTime" className="text-xs text-slate-700 dark:text-slate-300 font-medium">Start Time</Label>
                <Input 
                  id="startTime" 
                  type="time" 
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="mt-1 bg-white dark:bg-[#11141c]/90 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200"
                />
              </div>
              <span className="text-slate-400 dark:text-slate-500 mt-5">-</span>
              <div className="flex-1">
                <Label htmlFor="endTime" className="text-xs text-slate-700 dark:text-slate-300 font-medium">End Time</Label>
                <Input 
                  id="endTime" 
                  type="time" 
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="mt-1 bg-white dark:bg-[#11141c]/90 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <Checkbox 
                id="wholeWeek" 
                checked={applyWholeWeek}
                onChange={(e: any) => setApplyWholeWeek(e.target.checked)}
              />
              <label
                htmlFor="wholeWeek"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Apply same time for a week (next 7 days)
              </label>
            </div>

            {error && <Alert variant="error">{error}</Alert>}

            <Button type="submit" disabled={isPending} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-sm cursor-pointer">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Availability
            </Button>
          </form>
          )}

          {/* Existing Slots */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center">
              <Clock className="w-4 h-4 mr-2 text-brand-600 dark:text-slate-400" />
              Scheduled Slots
            </h4>
            
            {selectedDateSlots.length === 0 ? (
              <div className="text-center py-8 bg-slate-50/70 dark:bg-[#111723]/30 border border-slate-200/90 dark:border-slate-700/50 rounded-xl border-dashed">
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No availability set for this date.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDateSlots.map(slot => (
                  <div key={slot.id} className="flex items-center justify-between p-3.5 bg-slate-50/80 dark:bg-[#111723]/80 border border-slate-200/90 dark:border-slate-700/50 rounded-xl shadow-xs transition-colors">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                      {slot.startTime} – {slot.endTime}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteSlot(slot.id)}
                      disabled={isPending}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

