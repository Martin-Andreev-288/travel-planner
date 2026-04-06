import { Calendar, Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-8 sm:py-10">
      {/* Back link placeholder */}
      <div className="mb-4 h-5 w-40 animate-pulse rounded bg-gray-200" />

      {/* Title row */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="h-9 w-2/3 animate-pulse rounded bg-gray-200" />
        <div className="h-10 w-40 animate-pulse rounded-lg bg-gray-200" />
      </div>

      {/* Day cards skeleton */}
      {[1, 2].map((day) => (
        <div
          key={day}
          className="mb-6 rounded-2xl bg-white/60 p-4 shadow-md backdrop-blur-md"
        >
          <div className="mb-3 flex items-center">
            <Calendar size={16} className="mr-2 text-gray-300" />
            <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="rounded-md border border-gray-200/50 bg-white/80 p-3 shadow-sm"
              >
                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Centered spinner */}
      <div className="flex justify-center pt-4">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    </div>
  );
}
