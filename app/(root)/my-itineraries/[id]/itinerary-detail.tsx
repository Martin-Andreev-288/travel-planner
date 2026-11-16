"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MessageSquarePlus,
  Pencil,
  Plus,
  Trash2,
  Loader2,
  Check,
  MapPin,
  X,
} from "lucide-react";
import {
  addItineraryItem,
  updateItineraryItem,
  deleteItineraryItem,
} from "@/app/actions/itinerary-actions";
import AddActivityDialog from "@/app/components/shared/add-activity-dialog";
import { latestDate, mostCommonCity } from "@/app/utils/activity-defaults";
import type { ItineraryActivity } from "@/lib/validations";

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
  const [editError, setEditError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  // Changes on every opening so the add form starts empty each time
  const [addFormKey, setAddFormKey] = useState(0);

  const openAddActivity = () => {
    setAddFormKey((key) => key + 1);
    setIsAdding(true);
  };

  // A saved trip: the activity is stored right away, then shown
  const saveActivity = async (activity: ItineraryActivity) => {
    const result = await addItineraryItem(id, activity);
    if (result.success && result.item) {
      const item = result.item;
      setItems((prev) => [...prev, item]);
    }
    return result;
  };

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

  // Each activity's city is only worth showing when the trip has several
  const isMultiCity = new Set(items.map((item) => item.city)).size > 1;

  const datesWithDayNumbers = sortedDates.map((date, index) => ({
    date,
    dayNumber: date !== "Unscheduled" ? index + 1 : null,
  }));

  const startEditing = (item: ItineraryItem) => {
    setEditingId(item.id);
    setEditError(null);
    setEditValues({
      name: item.name,
      city: item.city,
      date: item.date ?? "",
      startTime: item.startTime ?? "",
      endTime: item.endTime ?? "",
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValues({});
    setEditError(null);
  };

  const saveEdit = async (id: string) => {
    const data: Parameters<typeof updateItineraryItem>[1] = {};
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setSavingId(id);
    setEditError(null);

    const name = editValues.name?.trim();
    const city = editValues.city?.trim();
    if (name !== undefined && name !== item.name) {
      data.name = name;
    }
    if (city !== undefined && city !== item.city) {
      data.city = city;
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
                name: name ?? i.name,
                city: city ?? i.city,
                date: editValues.date || undefined,
                startTime: editValues.startTime || undefined,
                endTime: editValues.endTime || undefined,
              }
            : i,
        ),
      );
      setEditingId(null);
      setEditValues({});
    } else {
      setEditError(result.message ?? "Could not save the changes");
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
    <div className="mx-auto w-full max-w-2xl overflow-hidden px-4 py-6 sm:px-8 sm:py-10">
      <Link
        href="/my-itineraries"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-gray-900"
      >
        <ArrowLeft size={16} />
        Back to My Itineraries
      </Link>

      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="min-w-0 truncate py-2 text-2xl font-bold text-[#2c3e50] sm:text-3xl">
          {title}
        </h1>
        {items.length > 0 && (
          <Link
            href={`/#${encodeURIComponent(JSON.stringify({ itineraryId: id, toolCalls: items.map((item) => ({ toolName: "addItineraryItem" as const, args: { id: item.id, name: item.name, city: item.city, ...(item.date && { date: item.date }), ...(item.startTime && { startTime: item.startTime }), ...(item.endTime && { endTime: item.endTime }) } })) }))}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-gray-700"
          >
            <MessageSquarePlus size={16} />
            Continue Planning
          </Link>
        )}
      </div>

      {items.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl bg-white/60 px-6 py-10 text-center shadow-md backdrop-blur-md">
          <Calendar size={36} className="mb-3 text-gray-300" />
          <p className="mb-1 font-medium text-[#2c3e50]">
            This trip has no activities yet
          </p>
          <p className="mb-5 text-sm text-gray-500">
            Add the places and things you want to do, with dates and times if
            you know them.
          </p>
          <button
            onClick={openAddActivity}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus size={16} />
            Add activity
          </button>
        </div>
      )}

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
                        aria-label="Activity"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm font-semibold text-gray-800 focus:border-blue-400 focus:outline-none"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={editValues.city ?? ""}
                        onChange={(e) =>
                          setEditValues((v) => ({ ...v, city: e.target.value }))
                        }
                        onKeyDown={(e) => handleKeyDown(e, item.id)}
                        aria-label="City"
                        placeholder="City"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 focus:border-blue-400 focus:outline-none"
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
                      {editError && (
                        <p role="alert" className="text-xs text-red-600">
                          {editError}
                        </p>
                      )}
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
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-semibold text-gray-800">
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
                        {isMultiCity && (
                          <div className="mt-1 flex items-center text-xs text-gray-600">
                            <MapPin size={12} className="mr-1 text-gray-500" />
                            <span>{item.city}</span>
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

      {items.length > 0 && (
        <button
          onClick={openAddActivity}
          className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-blue-400 hover:bg-white/60 hover:text-blue-700"
        >
          <Plus size={16} />
          Add activity
        </button>
      )}

      <AddActivityDialog
        key={addFormKey}
        open={isAdding}
        defaultCity={mostCommonCity(items)}
        defaultDate={latestDate(items)}
        onSave={saveActivity}
        onClose={() => setIsAdding(false)}
      />
    </div>
  );
}
