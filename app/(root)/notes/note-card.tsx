"use client";

import { useState } from "react";
import { FolderInput, Loader2, Pencil, Trash2 } from "lucide-react";
import { deleteNote } from "@/app/actions/note-actions";
import ConfirmDialog from "@/app/components/shared/confirm-dialog";
import type { NoteSummary } from "./types";

interface NoteCardProps {
  note: NoteSummary;
  isOpening: boolean;
  isDragging: boolean;
  // Opens the note for reading
  onOpen: () => void;
  onEdit: () => void;
  // Omitted when there is no folder to move the note into
  onMove?: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export default function NoteCard({
  note,
  isOpening,
  isDragging,
  onOpen,
  onEdit,
  onMove,
  onDragStart,
  onDragEnd,
}: NoteCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setShowConfirm(false);
    setIsDeleting(true);
    const result = await deleteNote(note.id);
    if (!result.success) setIsDeleting(false);
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        // Firefox only starts a drag when some data is set
        e.dataTransfer.setData("text/plain", note.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      // A click anywhere on the card opens the note, except on the card's own
      // buttons and inside its delete confirmation dialog. The title button
      // below is the same action for keyboard and screen reader users.
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button, a, dialog")) return;
        onOpen();
      }}
      className={`flex cursor-pointer flex-col rounded-xl bg-white p-5 shadow-md transition hover:shadow-lg active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <h2 className="mb-2 text-lg font-bold text-[#2c3e50]">
        <button
          onClick={onOpen}
          title="Open note"
          className="block w-full truncate rounded text-left hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-500"
        >
          {note.title}
        </button>
      </h2>

      {note.preview ? (
        <p className="mb-3 line-clamp-3 text-sm whitespace-pre-line text-gray-600">
          {note.preview}
        </p>
      ) : (
        <p className="mb-3 text-sm text-gray-400 italic">Empty note</p>
      )}

      <p className="mb-4 text-xs text-gray-400">Updated {note.updatedOn}</p>

      {/* Actions */}
      <div className="mt-auto flex flex-wrap gap-2">
        <button
          onClick={onEdit}
          disabled={isOpening || isDeleting}
          className="flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-60"
        >
          {isOpening ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Pencil size={14} />
          )}
          Edit
        </button>
        {onMove && (
          <button
            onClick={onMove}
            disabled={isDeleting}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60"
          >
            <FolderInput size={14} />
            Move
          </button>
        )}
        <button
          onClick={() => setShowConfirm(true)}
          disabled={isDeleting}
          className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
        >
          {isDeleting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Trash2 size={14} />
          )}
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
      </div>

      <ConfirmDialog
        open={showConfirm}
        message={`Are you sure you want to delete "${note.title}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
