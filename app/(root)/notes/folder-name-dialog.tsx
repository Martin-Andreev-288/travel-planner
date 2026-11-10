"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { ActionResult } from "./types";
import { useModalDialog } from "./use-modal-dialog";

interface FolderNameDialogProps {
  open: boolean;
  heading: string;
  initialName: string;
  submitLabel: string;
  onSave: (name: string) => Promise<ActionResult>;
  onClose: () => void;
}

// Used both for creating a folder and for renaming one
export default function FolderNameDialog({
  open,
  heading,
  initialName,
  submitLabel,
  onSave,
  onClose,
}: FolderNameDialogProps) {
  const dialogRef = useModalDialog(open);
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    const result = await onSave(name);
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
      aria-labelledby="folder-name-heading"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border-0 bg-white p-0 shadow-xl backdrop:bg-black/40"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        <h2
          id="folder-name-heading"
          className="text-xl font-bold text-[#2c3e50]"
        >
          {heading}
        </h2>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
          Folder name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Berlin trip"
            autoFocus
            className="rounded-lg border border-gray-300 px-3 py-2 text-base font-normal text-gray-900 outline-none focus:border-blue-500"
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
            disabled={isSaving || !name.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {isSaving && <Loader2 size={14} className="animate-spin" />}
            {isSaving ? "Saving…" : submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
