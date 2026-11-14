"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { ActionResult } from "./types";
import { useModalDialog } from "@/app/components/shared/use-modal-dialog";

// Value of the "no folder" option; real folder ids are never empty
const TOP_LEVEL = "";

interface MoveDialogProps {
  open: boolean;
  heading: string;
  itemName: string;
  // Folders the item can be moved into, depth-first with their nesting depth
  options: { id: string; name: string; depth: number }[];
  currentFolderId: string | null;
  onMove: (targetFolderId: string | null) => Promise<ActionResult>;
  onClose: () => void;
}

// Keyboard- and touch-friendly alternative to drag and drop
export default function MoveDialog({
  open,
  heading,
  itemName,
  options,
  currentFolderId,
  onMove,
  onClose,
}: MoveDialogProps) {
  const dialogRef = useModalDialog(open);
  const [target, setTarget] = useState(currentFolderId ?? TOP_LEVEL);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUnchanged = target === (currentFolderId ?? TOP_LEVEL);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    const result = await onMove(target === TOP_LEVEL ? null : target);
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
      aria-labelledby="move-dialog-heading"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border-0 bg-white p-0 shadow-xl backdrop:bg-black/40"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        <div>
          <h2
            id="move-dialog-heading"
            className="text-xl font-bold text-[#2c3e50]"
          >
            {heading}
          </h2>
          <p className="mt-1 truncate text-sm text-gray-500">{itemName}</p>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
          Move to
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-base font-normal text-gray-900 outline-none focus:border-blue-500"
          >
            <option value={TOP_LEVEL}>Top level (no folder)</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {`${"— ".repeat(option.depth)}${option.name}`}
              </option>
            ))}
          </select>
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
            disabled={isSaving || isUnchanged}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {isSaving && <Loader2 size={14} className="animate-spin" />}
            {isSaving ? "Moving…" : "Move"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
