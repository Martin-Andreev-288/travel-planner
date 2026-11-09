"use client";

import { useState } from "react";
import { Plus, StickyNote } from "lucide-react";
import { createNote, getNote, updateNote } from "@/app/actions/note-actions";
import NoteCard, { type NoteSummary } from "./note-card";
import NoteEditorDialog, { type NoteDraft } from "./note-editor-dialog";

type EditorState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; noteId: string; initial: NoteDraft };

interface NotesDashboardProps {
  notes: NoteSummary[];
}

// Renders straight from props: every note action calls revalidatePath("/notes"),
// which sends the updated list back to this page without a manual refresh
export default function NotesDashboard({ notes }: NotesDashboardProps) {
  const [editor, setEditor] = useState<EditorState>({ open: false });
  const [loadingNoteId, setLoadingNoteId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const openEditor = async (noteId: string) => {
    setLoadError(null);
    setLoadingNoteId(noteId);
    const result = await getNote(noteId);
    setLoadingNoteId(null);

    if (!result.success || !result.note) {
      setLoadError(result.message ?? "Could not open the note");
      return;
    }

    setEditor({
      open: true,
      mode: "edit",
      noteId,
      initial: { title: result.note.title, content: result.note.content },
    });
  };

  const handleSave = async (draft: NoteDraft) => {
    if (!editor.open) return { success: false, message: "No note is open" };
    return editor.mode === "create"
      ? createNote(draft.title, draft.content)
      : updateNote(editor.noteId, draft);
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#2c3e50]">📝 Notes</h1>
          <p className="mt-2 text-gray-600">
            {notes.length === 0
              ? "You don't have any notes yet."
              : `${notes.length} ${notes.length === 1 ? "note" : "notes"}`}
          </p>
        </div>
        <button
          onClick={() => setEditor({ open: true, mode: "create" })}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={16} />
          New note
        </button>
      </div>

      {loadError && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {loadError}
        </p>
      )}

      {notes.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl bg-white px-6 py-12 text-center shadow-md">
          <StickyNote size={40} className="mb-4 text-gray-300" />
          <p className="mb-1 font-medium text-[#2c3e50]">
            Keep everything for your trips in one place
          </p>
          <p className="text-sm text-gray-500">
            Packing lists, places to visit, booking details: create your first
            note to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              isOpening={loadingNoteId === note.id}
              onEdit={() => openEditor(note.id)}
            />
          ))}
        </div>
      )}

      {/* Keyed so each opening starts from that note's own values */}
      <NoteEditorDialog
        key={
          editor.open
            ? editor.mode === "edit"
              ? editor.noteId
              : "create"
            : "closed"
        }
        open={editor.open}
        heading={
          editor.open && editor.mode === "edit" ? "Edit note" : "New note"
        }
        initial={
          editor.open && editor.mode === "edit"
            ? editor.initial
            : { title: "", content: "" }
        }
        onSave={handleSave}
        onClose={() => setEditor({ open: false })}
      />
    </>
  );
}
