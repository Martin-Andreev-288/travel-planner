"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MessageSquarePlus,
  Pencil,
  Trash2,
  Loader2,
  Check,
  X,
} from "lucide-react";
import {
  updateItineraryItem,
  deleteItineraryItem,
} from "@/app/actions/itinerary-actions";

interface ItineraryItem {
  id: string;
  name: string;
  city: string;
  location?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
}

interface ItineraryDetailProps {
  id: string;
  title: string;
  items: ItineraryItem[];
}

export default function ItineraryDetail({
  id,
  title,
  items: initialItems,
}: ItineraryDetailProps) {
  const [items, setItems] = useState(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<ItineraryItem>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Group items by date
  const groupedItems = items.reduce<Record<string, ItineraryItem[]>>(
    (groups, item) => {
      const date = item.date
        ? new Date(item.date).toLocaleDateString(undefined, {
            dateStyle: "medium",
          })
        : "Unscheduled";
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
      return groups;
    },
    {},
  );

  // Sort items in each group by start time
  Object.keys(groupedItems).forEach((date) => {
    groupedItems[date].sort((a, b) => {
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return (a.startTime || "").localeCompare(b.startTime || "");
    });
  });

  // Sort dates (Unscheduled last)
  const sortedDates = Object.keys(groupedItems).sort((a, b) => {
    if (a === "Unscheduled") return 1;
    if (b === "Unscheduled") return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  const datesWithDayNumbers = sortedDates.map((date, index) => ({
    date,
    dayNumber: date !== "Unscheduled" ? index + 1 : null,
  }));

  const startEditing = (item: ItineraryItem) => {
    setEditingId(item.id);
    setEditValues({
      name: item.name,
      date: item.date ?? "",
      startTime: item.startTime ?? "",
      endTime: item.endTime ?? "",
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveEdit = async (id: string) => {
    setSavingId(id);
    const data: Parameters<typeof updateItineraryItem>[1] = {};
    const item = items.find((i) => i.id === id);
    if (!item) return;

    if (editValues.name !== undefined && editValues.name !== item.name) {
      data.name = editValues.name;
    }
    if (editValues.date !== undefined) {
      data.date = editValues.date || null;
    }
    if (editValues.startTime !== undefined) {
      data.startTime = editValues.startTime || null;
    }
    if (editValues.endTime !== undefined) {
      data.endTime = editValues.endTime || null;
    }

    const result = await updateItineraryItem(id, data);
    if (result.success) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                name: editValues.name ?? i.name,
                date: editValues.date || undefined,
                startTime: editValues.startTime || undefined,
                endTime: editValues.endTime || undefined,
              }
            : i,
        ),
      );
      setEditingId(null);
      setEditValues({});
    }
    setSavingId(null);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await deleteItineraryItem(id);
    if (result.success) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
    setDeletingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") saveEdit(id);
    if (e.key === "Escape") cancelEditing();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
      <Link
        href="/my-itineraries"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-gray-900"
      >
        <ArrowLeft size={16} />
        Back to My Itineraries
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#2c3e50] sm:text-3xl">
          {title}
        </h1>
        {items.length > 0 && (
          <Link
            href={`/#${encodeURIComponent(JSON.stringify({ itineraryId: id, toolCalls: items.map((item) => ({ toolName: "addItineraryItem" as const, args: { id: item.id, name: item.name, city: item.city, ...(item.date && { date: item.date }), ...(item.startTime && { startTime: item.startTime }), ...(item.endTime && { endTime: item.endTime }) } })) }))}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            <MessageSquarePlus size={16} />
            Continue Planning
          </Link>
        )}
      </div>

      <div className="space-y-6">
        {datesWithDayNumbers.map(({ date, dayNumber }) => (
          <div
            key={date}
            className="rounded-2xl bg-white/60 p-4 shadow-md backdrop-blur-md"
          >
            <div className="mb-3 flex items-center">
              <Calendar size={16} className="mr-2 text-gray-700" />
              <span className="text-base font-semibold text-gray-800">
                {dayNumber ? `Day ${dayNumber}` : ""}
                <span className="ml-2 font-normal text-gray-700">{date}</span>
              </span>
            </div>

            <div className="space-y-3">
              {groupedItems[date]?.map((item) => (
                <div
                  key={item.id}
                  className="group rounded-md border border-gray-200/50 bg-white/80 p-3 shadow-sm"
                >
                  {editingId === item.id ? (
                    /* ── Edit mode ── */
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editValues.name ?? ""}
                        onChange={(e) =>
                          setEditValues((v) => ({ ...v, name: e.target.value }))
                        }
                        onKeyDown={(e) => handleKeyDown(e, item.id)}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm font-semibold text-gray-800 focus:border-blue-400 focus:outline-none"
                        autoFocus
                      />
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="date"
                          value={editValues.date ?? ""}
                          onChange={(e) =>
                            setEditValues((v) => ({
                              ...v,
                              date: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => handleKeyDown(e, item.id)}
                          className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 focus:border-blue-400 focus:outline-none"
                        />
                        <input
                          type="time"
                          value={editValues.startTime ?? ""}
                          onChange={(e) =>
                            setEditValues((v) => ({
                              ...v,
                              startTime: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => handleKeyDown(e, item.id)}
                          className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 focus:border-blue-400 focus:outline-none"
                        />
                        <span className="self-center text-xs text-gray-400">
                          –
                        </span>
                        <input
                          type="time"
                          value={editValues.endTime ?? ""}
                          onChange={(e) =>
                            setEditValues((v) => ({
                              ...v,
                              endTime: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => handleKeyDown(e, item.id)}
                          className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 focus:border-blue-400 focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(item.id)}
                          disabled={savingId === item.id}
                          className="inline-flex items-center gap-1 rounded bg-gray-800 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-60"
                        >
                          {savingId === item.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Check size={12} />
                          )}
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="inline-flex items-center gap-1 rounded bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-300"
                        >
                          <X size={12} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── View mode ── */
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-800">
                          {item.name}
                        </h4>
                        {item.startTime && (
                          <div className="mt-1 flex items-center text-xs text-gray-600">
                            <Clock size={12} className="mr-1 text-gray-500" />
                            <span>
                              {item.endTime
                                ? `${item.startTime} - ${item.endTime}`
                                : item.startTime}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => startEditing(item)}
                          className="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="rounded p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                          title="Remove"
                        >
                          {deletingId === item.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
