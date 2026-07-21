"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { addAvailabilitySlots, deleteAvailabilitySlot, type DateAvailabilitySlot } from "@/actions/availability-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

interface ExistingSlot {
  id: string;
  date: string; // ISO string
  startTime: string;
  endTime: string;
}

interface AvailabilityEditorProps {
  initialSlots: ExistingSlot[];
}

export function AvailabilityEditor({ initialSlots }: AvailabilityEditorProps) {
  const [existingSlots, setExistingSlots] = useState<ExistingSlot[]>(initialSlots);
  const [newSlots, setNewSlots] = useState<DateAvailabilitySlot[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  function addNewSlot() {
    const today = new Date().toISOString().split("T")[0];
    setNewSlots([...newSlots, { date: today, startTime: "09:00", endTime: "17:00" }]);
    setSuccess(false);
  }

  function updateNewSlot(index: number, field: keyof DateAvailabilitySlot, value: string) {
    const updated = [...newSlots];
    updated[index] = { ...updated[index], [field]: value };
    setNewSlots(updated);
    setSuccess(false);
  }

  function removeNewSlot(index: number) {
    setNewSlots(newSlots.filter((_, i) => i !== index));
    setSuccess(false);
  }

  function handleDeleteExisting(id: string) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await deleteAvailabilitySlot(id);
      if (!result.success) {
        setError(result.error || "Failed to delete slot");
      } else {
        setExistingSlots(existingSlots.filter(s => s.id !== id));
      }
    });
  }

  function handleSave() {
    if (newSlots.length === 0) return;
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await addAvailabilitySlots(newSlots);
      if (!result.success) {
        setError(result.error || "Failed to save availability");
      } else {
        setSuccess(true);
        setNewSlots([]);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Existing slots */}
      {existingSlots.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-3">Saved Availability</h3>
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {existingSlots.map(slot => (
              <div key={slot.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <span className="text-sm text-slate-700 font-medium w-32 shrink-0">
                  {new Date(slot.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
                <span className="text-sm text-slate-500">{slot.startTime} – {slot.endTime}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteExisting(slot.id)}
                  disabled={isPending}
                  className="ml-auto shrink-0"
                  aria-label="Remove slot"
                >
                  <Trash2 className="h-4 w-4 text-slate-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {existingSlots.length === 0 && newSlots.length === 0 && (
        <p className="text-sm text-slate-500">
          You haven't set any availability yet. Add your preferred working hours below.
        </p>
      )}

      {/* New slots to add */}
      {newSlots.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-3">New Slots</h3>
          <div className="space-y-2">
            {newSlots.map((slot, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3 rounded-lg border border-brand-200 bg-brand-50/30 p-3 shadow-sm sm:flex-nowrap">
                <Input
                  type="date"
                  value={slot.date}
                  onChange={(e) => updateNewSlot(i, "date", e.target.value)}
                  className="w-full sm:w-40"
                  required
                />
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => updateNewSlot(i, "startTime", e.target.value)}
                    className="w-full sm:w-28"
                    required
                  />
                  <span className="text-slate-500">to</span>
                  <Input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => updateNewSlot(i, "endTime", e.target.value)}
                    className="w-full sm:w-28"
                    required
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeNewSlot(i)}
                  className="ml-auto w-full sm:w-auto shrink-0"
                  aria-label="Remove slot"
                >
                  <Trash2 className="h-4 w-4 text-slate-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
        <Button variant="secondary" onClick={addNewSlot} type="button">
          <Plus className="mr-2 h-4 w-4" />
          Add slot
        </Button>
        {newSlots.length > 0 && (
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save Availability"}
          </Button>
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">Availability saved successfully!</Alert>}
    </div>
  );
}
