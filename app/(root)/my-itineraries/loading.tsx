import { Calendar, MapPin } from "lucide-react";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-16">
      {/* Header */}
      <div className="mb-8">
        <div className="h-9 w-64 animate-pulse rounded bg-gray-200" />
        <div className="mt-2 h-5 w-40 animate-pulse rounded bg-gray-200" />
      </div>

      {/* Card grid skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex flex-col rounded-xl bg-white p-5 shadow-md"
          >
            {/* Title */}
            <div className="mb-3">
              <div className="h-6 w-3/4 animate-pulse rounded bg-gray-200" />
            </div>

            {/* Date range */}
            <div className="mb-2 flex items-center gap-1.5">
              <Calendar size={14} className="text-gray-300" />
              <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
            </div>

            {/* City pills */}
            <div className="mb-3 flex gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50/50 px-2.5 py-0.5">
                <MapPin size={10} className="text-blue-300" />
                <div className="h-3 w-16 animate-pulse rounded bg-blue-100" />
              </span>
            </div>

            {/* Activity count */}
            <div className="mb-1 h-4 w-24 animate-pulse rounded bg-gray-200" />

            {/* Saved on */}
            <div className="mb-4 h-3 w-36 animate-pulse rounded bg-gray-200" />

            {/* Action buttons */}
            <div className="mt-auto flex gap-2">
              <div className="h-9 w-20 animate-pulse rounded-lg bg-gray-200" />
              <div className="h-9 w-24 animate-pulse rounded-lg bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
