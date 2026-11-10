"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import type { ActionResult } from "./types";
import { useModalDialog } from "./use-modal-dialog";

export type NoteDraft = { title: string; content: string };

interface NoteEditorDialogProps {
  open: boolean;
  heading: string;
  initial: NoteDraft;
  onSave: (draft: NoteDraft) => Promise<ActionResult>;
  onClose: () => void;
}

export default function NoteEditorDialog({
  open,
  heading,
  initial,
  onSave,
  onClose,
}: NoteEditorDialogProps) {
  const dialogRef = useModalDialog(open);
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    const result = await onSave({ title, content });
    setIsSaving(false);

    if (result.success) {
      onClose();
    } else {
      setError(result.message);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="note-editor-heading"
      className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-xl border-0 bg-white p-0 shadow-xl backdrop:bg-black/40"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h2
            id="note-editor-heading"
            className="text-xl font-bold text-[#2c3e50]"
          >
            {heading}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Packing list for Berlin"
            autoFocus
            className="rounded-lg border border-gray-300 px-3 py-2 text-base font-normal text-gray-900 outline-none focus:border-blue-500"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
          Content
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            placeholder="Write anything you want to remember…"
            className="resize-y rounded-lg border border-gray-300 px-3 py-2 text-base font-normal text-gray-900 outline-none focus:border-blue-500"
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
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || !title.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {isSaving && <Loader2 size={14} className="animate-spin" />}
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
