"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { addItineraryItem } from "@/app/actions/itinerary-actions";
import type { TravelItineraryItem } from "@/app/api/chat/itinerary-store";
import { useModalDialog } from "@/app/components/shared/use-modal-dialog";
import { itineraryActivitySchema } from "@/lib/validations";

interface AddActivityDialogProps {
  open: boolean;
  itineraryId: string;
  // Prefilled so adding several activities for the same place and day is quick
  defaultCity: string;
  defaultDate: string;
  onAdded: (item: TravelItineraryItem) => void;
  onClose: () => void;
}

const inputClass =
  "rounded-lg border border-gray-300 px-3 py-2 text-base font-normal text-gray-900 outline-none focus:border-blue-500";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-gray-700";

export default function AddActivityDialog({
  open,
  itineraryId,
  defaultCity,
  defaultDate,
  onAdded,
  onClose,
}: AddActivityDialogProps) {
  const dialogRef = useModalDialog(open);
  const [name, setName] = useState("");
  const [city, setCity] = useState(defaultCity);
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Same rules as the server, checked here first for instant feedback.
    // Empty optional fields are sent as "not set".
    const parsed = itineraryActivitySchema.safeParse({
      name,
      city,
      date: date || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setIsSaving(true);
    const result = await addItineraryItem(itineraryId, parsed.data);
    setIsSaving(false);

    if (result.success && result.item) {
      onAdded(result.item);
      onClose();
    } else {
      setError(result.message);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="add-activity-heading"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border-0 bg-white p-0 shadow-xl backdrop:bg-black/40"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        <h2
          id="add-activity-heading"
          className="text-xl font-bold text-[#2c3e50]"
        >
          Add activity
        </h2>

        <label className={labelClass}>
          Activity
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Visit the Colosseum"
            maxLength={100}
            autoFocus
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          City
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Rome"
            maxLength={100}
            className={inputClass}
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className={labelClass}>
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Start
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            End
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        <p className="-mt-2 text-xs text-gray-400">
          Date and times are optional. Activities without a date are listed
          under &ldquo;Unscheduled&rdquo;.
        </p>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || !name.trim() || !city.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {isSaving && <Loader2 size={14} className="animate-spin" />}
            {isSaving ? "Adding…" : "Add"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
