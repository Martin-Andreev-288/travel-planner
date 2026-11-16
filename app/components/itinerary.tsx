"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { nanoid } from "nanoid";
import {
  Calendar,
  Clock,
  Bookmark,
  Loader2,
  Check,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { TravelItineraryItem } from "../api/chat/itinerary-store";
import { saveItinerary, updateItinerary } from "../actions/itinerary-actions";
import AddActivityDialog from "./shared/add-activity-dialog";
import { latestDate, mostCommonCity } from "../utils/activity-defaults";
import type { ItineraryActivity } from "@/lib/validations";

interface ItineraryDisplayProps {
  groupedItems: Record<string, TravelItineraryItem[]>;
  itineraryItems?: TravelItineraryItem[];
  currentItineraryId?: string | null;
  onUpdateItem?: (id: string, updates: Partial<TravelItineraryItem>) => void;
  onDeleteItem?: (id: string) => void;
  // Adds an activity created by hand; the button is only shown when given
  onAddItem?: (item: TravelItineraryItem) => void;
}

// Container variants for staggering days
const dayContainerVariants = {
  hidden: { opacity: 0 },
  visible: (i = 1) => ({
    opacity: 1,
    transition: { staggerChildren: 0.1 * i, delayChildren: 0.1 }, // Stagger days
  }),
  exit: (i = 1) => ({
    opacity: 0,
    transition: { staggerChildren: 0.05 * i, staggerDirection: -1 },
  }),
};

// Variants for individual day cards
const dayCardVariants = {
  hidden: { x: 50, opacity: 0 }, // Fly in from right
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "tween", duration: 0.3 },
  },
};

// Variants for individual itinerary items within a day
const itemVariants = {
  hidden: { x: 30, opacity: 0 }, // Fly in from right
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "tween", duration: 0.2 }, // Faster transition for items
  },
};

const ItineraryDisplay: React.FC<ItineraryDisplayProps> = ({
  groupedItems,
  itineraryItems,
  currentItineraryId,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
}) => {
  const [saveState, setSaveState] = useState<
    "idle" | "loading" | "saved" | "sign-in"
  >("idle");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<TravelItineraryItem>>(
    {},
  );

  const hasItems = Object.keys(groupedItems).length > 0;
  const [isAdding, setIsAdding] = useState(false);
  // Changes on every opening so the add form starts empty each time
  const [addFormKey, setAddFormKey] = useState(0);

  const openAddActivity = () => {
    setAddFormKey((key) => key + 1);
    setIsAdding(true);
  };

  // On Home the itinerary lives in the browser until it's saved, so the
  // activity only joins the panel's list. Its id is what the chat sees, which
  // lets the AI change or remove it later like any other activity. (nanoid,
  // unlike crypto.randomUUID, also works on plain-http addresses such as the
  // dev server opened from a phone on the local network.)
  const saveActivity = async (activity: ItineraryActivity) => {
    onAddItem?.({
      id: `manual-${nanoid(8)}`,
      ...activity,
    });
    return { success: true };
  };

  const handleSave = async () => {
    setSaveState("loading");
    try {
      const result = currentItineraryId
        ? await updateItinerary(currentItineraryId, itineraryItems!)
        : await saveItinerary(itineraryItems!);
      if (result.success) {
        localStorage.removeItem("guest_itinerary");
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      } else if (result.message === "Sign in to save your itinerary") {
        setSaveState("sign-in");
      } else {
        setSaveState("idle");
      }
    } catch {
      setSaveState("idle");
    }
  };

  const startEditing = (item: TravelItineraryItem) => {
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

  const commitEdit = (id: string) => {
    if (onUpdateItem && editValues.name?.trim()) {
      onUpdateItem(id, {
        name: editValues.name,
        date: editValues.date || undefined,
        startTime: editValues.startTime || undefined,
        endTime: editValues.endTime || undefined,
      });
    }
    setEditingId(null);
    setEditValues({});
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") commitEdit(id);
    if (e.key === "Escape") cancelEditing();
  };

  // Sort dates (with "Unscheduled" at the end)
  const sortedDates = Object.keys(groupedItems).sort((a, b) => {
    if (a === "Unscheduled") return 1;
    if (b === "Unscheduled") return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  // Create a new array with day numbers for each date (excluding "Unscheduled")
  const datesWithDayNumbers = sortedDates.map((date, index) => {
    return {
      date,
      dayNumber: date !== "Unscheduled" ? index + 1 : null,
    };
  });

  return (
    <motion.div
      variants={dayContainerVariants}
      initial="hidden"
      animate="visible"
      exit="exit" // Add exit animation
      className="scrollbar-thin pointer-events-auto col-span-1 h-full w-full space-y-4 overflow-y-auto pb-4 lg:w-[32rem]"
    >
      {datesWithDayNumbers.map(({ date, dayNumber }) => (
        <motion.div
          key={date}
          variants={dayCardVariants}
          initial="hidden"
          animate="visible"
          // Stagger children (items) within this day card
          transition={{ staggerChildren: 0.05 }}
        >
          <div className="mb-2 min-w-full rounded-2xl bg-white/60 p-4 shadow-md backdrop-blur-md">
            <div className="mb-3 flex items-center">
              <Calendar size={16} className="mr-2 text-gray-700" />
              <span className="text-base font-semibold text-gray-800">
                {dayNumber ? `Day ${dayNumber}` : ""}
                <span className="ml-2 font-normal text-gray-700">{date}</span>
              </span>
            </div>
            <motion.div className="space-y-3">
              {groupedItems[date]?.map((item) => (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
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
                        onKeyDown={(e) => handleEditKeyDown(e, item.id)}
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
                          onKeyDown={(e) => handleEditKeyDown(e, item.id)}
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
                          onKeyDown={(e) => handleEditKeyDown(e, item.id)}
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
                          onKeyDown={(e) => handleEditKeyDown(e, item.id)}
                          className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 focus:border-blue-400 focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => commitEdit(item.id)}
                          className="inline-flex items-center gap-1 rounded bg-gray-800 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-gray-700"
                        >
                          <Check size={12} />
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
                      </div>
                      {onUpdateItem && onDeleteItem && (
                        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => startEditing(item)}
                            className="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => onDeleteItem(item.id)}
                            className="rounded p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                            title="Remove"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      ))}

      {onAddItem && (
        <button
          onClick={openAddActivity}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-gray-300 bg-white/60 px-4 py-3 text-sm font-medium text-gray-600 backdrop-blur-md transition-colors hover:border-blue-400 hover:text-blue-700"
        >
          <Plus size={16} />
          Add activity
        </button>
      )}

      {hasItems && itineraryItems && (
        <div className="pb-2">
          {saveState === "sign-in" ? (
            <p className="text-center text-sm text-gray-600">
              <Link
                href="/sign-in"
                className="font-medium text-blue-600 underline hover:text-blue-800"
              >
                Sign in
              </Link>{" "}
              to save your itinerary
            </p>
          ) : (
            <button
              onClick={handleSave}
              disabled={saveState === "loading" || saveState === "saved"}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-800 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-60 lg:w-auto"
            >
              {saveState === "loading" && (
                <Loader2 size={16} className="animate-spin" />
              )}
              {saveState === "saved" && <Check size={16} />}
              {saveState === "idle" && <Bookmark size={16} />}
              {saveState === "loading"
                ? "Saving…"
                : saveState === "saved"
                  ? "Saved!"
                  : currentItineraryId
                    ? "Update Itinerary"
                    : "Save Itinerary"}
            </button>
          )}
        </div>
      )}

      {onAddItem && (
        <AddActivityDialog
          key={addFormKey}
          open={isAdding}
          defaultCity={mostCommonCity(itineraryItems ?? [])}
          defaultDate={latestDate(itineraryItems ?? [])}
          onSave={saveActivity}
          onClose={() => setIsAdding(false)}
        />
      )}
    </motion.div>
  );
};

export default ItineraryDisplay;
