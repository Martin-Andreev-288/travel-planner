"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { createItinerary } from "@/app/actions/itinerary-actions";
import { useModalDialog } from "@/app/components/shared/use-modal-dialog";

// Creates an empty itinerary and opens it, where activities are added by hand
export default function NewTripButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dialogRef = useModalDialog(open);
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openDialog = () => {
    setName("");
    setError(null);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsCreating(true);
    const result = await createItinerary(name);

    if (result.success && result.id) {
      // Stays in the "Creating…" state until the new trip's page has loaded
      router.push(`/my-itineraries/${result.id}`);
      return;
    }

    setIsCreating(false);
    setError(result.message);
  };

  return (
    <>
      <button
        onClick={openDialog}
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        <Plus size={16} />
        New trip
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        aria-labelledby="new-trip-heading"
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border-0 bg-white p-0 shadow-xl backdrop:bg-black/40"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <div>
            <h2
              id="new-trip-heading"
              className="text-xl font-bold text-[#2c3e50]"
            >
              New trip
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Plan a trip yourself. You&apos;ll add its activities on the next
              page.
            </p>
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            Trip name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekend in Rome"
              maxLength={100}
              autoFocus
              className="rounded-lg border border-gray-300 px-3 py-2 text-base font-normal text-gray-900 outline-none focus:border-blue-500"
            />
          </label>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !name.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {isCreating && <Loader2 size={14} className="animate-spin" />}
              {isCreating ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
