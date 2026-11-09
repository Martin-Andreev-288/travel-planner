"use client";

import { useState } from "react";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { deleteNote } from "@/app/actions/note-actions";
import ConfirmDialog from "@/app/components/shared/confirm-dialog";

export type NoteSummary = {
  id: string;
  title: string;
  preview: string;
  updatedOn: string;
};

interface NoteCardProps {
  note: NoteSummary;
  isOpening: boolean;
  onEdit: () => void;
}

export default function NoteCard({ note, isOpening, onEdit }: NoteCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setShowConfirm(false);
    setIsDeleting(true);
    const result = await deleteNote(note.id);
    if (!result.success) setIsDeleting(false);
  };

  return (
    <div className="flex flex-col rounded-xl bg-white p-5 shadow-md transition-shadow hover:shadow-lg">
      <h2 className="mb-2 truncate text-lg font-bold text-[#2c3e50]">
        {note.title}
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
      <div className="mt-auto flex gap-2">
        <button
          onClick={onEdit}
          disabled={isOpening || isDeleting}
          className="flex items-center gap-1.5 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-60"
        >
          {isOpening ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Pencil size={14} />
          )}
          Edit
        </button>
        <button
          onClick={() => setShowConfirm(true)}
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

      <ConfirmDialog
        open={showConfirm}
        message={`Are you sure you want to delete "${note.title}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
