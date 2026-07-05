"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { updateAvailability, type AvailabilitySlot } from "@/actions/availability-actions";
import { Weekday } from "@/lib/enums";
import { WEEKDAY_LABEL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

export function AvailabilityEditor({ initialSlots }: { initialSlots: AvailabilitySlot[] }) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>(initialSlots);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  function addSlot() {
    setSlots([...slots, { day: Weekday.MONDAY, startTime: "09:00", endTime: "17:00" }]);
    setSuccess(false);
  }

  function removeSlot(index: number) {
    setSlots(slots.filter((_, i) => i !== index));
    setSuccess(false);
  }

  function updateSlot(index: number, field: keyof AvailabilitySlot, value: string) {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setSlots(newSlots);
    setSuccess(false);
  }

  function handleSave() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await updateAvailability(slots);
      if (!result.success) {
        setError(result.error || "Failed to save availability");
      } else {
        setSuccess(true);
      }
    });
  }

  return (
    <div className="space-y-4">
      {slots.length === 0 ? (
        <p className="text-sm text-slate-500">You haven't set any availability yet. Add your preferred working hours below.</p>
      ) : (
        <div className="max-h-[350px] overflow-y-auto space-y-3 pr-2">
          {slots.map((slot, i) => (
            <div key={i} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:flex-nowrap">
              <Select
                value={slot.day}
                onChange={(e) => updateSlot(i, "day", e.target.value)}
                className="w-full sm:w-40"
              >
                {Object.entries(WEEKDAY_LABEL).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </Select>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Input
                  type="time"
                  value={slot.startTime}
                  onChange={(e) => updateSlot(i, "startTime", e.target.value)}
                  className="w-full sm:w-28"
                  required
                />
                <span className="text-slate-500">to</span>
                <Input
                  type="time"
                  value={slot.endTime}
                  onChange={(e) => updateSlot(i, "endTime", e.target.value)}
                  className="w-full sm:w-28"
                  required
                />
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeSlot(i)}
                className="ml-auto w-full sm:w-auto shrink-0"
                aria-label="Remove slot"
              >
                <Trash2 className="h-4 w-4 text-slate-500" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 mt-4">
        <Button variant="secondary" onClick={addSlot} type="button">
          <Plus className="mr-2 h-4 w-4" />
          Add slot
        </Button>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save Availability"}
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">Availability saved successfully!</Alert>}
    </div>
  );
}
