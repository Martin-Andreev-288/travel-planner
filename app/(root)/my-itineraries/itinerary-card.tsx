"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Pencil, Trash2, Eye, MapPin, Calendar, Loader2 } from "lucide-react";
import {
  deleteItinerary,
  renameItinerary,
} from "@/app/actions/itinerary-actions";

interface ItineraryCardProps {
  id: string;
  title: string;
  dateRange: string;
  cities: string[];
  activityCount: number;
  savedOn: string;
}

export default function ItineraryCard({
  id,
  title: initialTitle,
  dateRange,
  cities,
  activityCount,
  savedOn,
}: ItineraryCardProps) {
  const [title, setTitle] = useState(initialTitle);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(initialTitle);
  const [isDeleting, setIsDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = () => {
    setEditValue(title);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitRename = async () => {
    setIsEditing(false);
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === title) return;
    setTitle(trimmed);
    await renameItinerary(id, trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitRename();
    if (e.key === "Escape") setIsEditing(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteItinerary(id);
    if (!result.success) setIsDeleting(false);
  };

  return (
    <div className="flex flex-col rounded-xl bg-white p-5 shadow-md transition-shadow hover:shadow-lg">
      {/* Title — editable inline */}
      <div className="mb-3 flex items-start gap-2">
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleKeyDown}
            className="w-full rounded border border-gray-300 px-2 py-1 text-lg font-bold text-[#2c3e50] outline-none focus:border-blue-500"
            autoFocus
          />
        ) : (
          <button
            onClick={startEditing}
            className="group flex min-w-0 items-center gap-1.5 text-left"
          >
            <h2 className="truncate text-lg font-bold text-[#2c3e50]">
              {title}
            </h2>
            <Pencil
              size={14}
              className="shrink-0 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100"
            />
          </button>
        )}
      </div>

      {/* Date range */}
      <div className="mb-2 flex items-center gap-1.5 text-sm text-gray-500">
        <Calendar size={14} />
        <span>{dateRange}</span>
      </div>

      {/* City pills */}
      {cities.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {cities.map((city) => (
            <span
              key={city}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
            >
              <MapPin size={10} />
              {city}
            </span>
          ))}
        </div>
      )}

      {/* Activity count */}
      <p className="mb-1 text-sm text-gray-600">
        {activityCount} {activityCount === 1 ? "activity" : "activities"}
      </p>

      {/* Saved on */}
      <p className="mb-4 text-xs text-gray-400">Saved {savedOn}</p>

      {/* Actions */}
      <div className="mt-auto flex gap-2">
        <Link
          href={`/my-itineraries/${id}`}
          className="flex items-center gap-1.5 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        >
          <Eye size={14} />
          View
        </Link>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
        >
          {isDeleting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Trash2 size={14} />
          )}
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
