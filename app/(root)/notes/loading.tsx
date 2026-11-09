import { Loader2 } from "lucide-react";

// Deliberately not a grid of skeleton cards: the number of notes (often zero)
// isn't known yet, so this shows one neutral panel in the place where both the
// empty state and the notes list appear
export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-16">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#2c3e50]">📝 Notes</h1>
          <div className="mt-3 h-5 w-24 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="h-10 w-28 shrink-0 animate-pulse rounded-lg bg-gray-200" />
      </div>

      <div
        role="status"
        className="flex flex-col items-center rounded-xl bg-white px-6 py-12 text-center shadow-md"
      >
        <Loader2 size={32} className="mb-3 animate-spin text-gray-300" />
        <p className="text-sm text-gray-500">Loading your notes…</p>
      </div>
    </div>
  );
}
