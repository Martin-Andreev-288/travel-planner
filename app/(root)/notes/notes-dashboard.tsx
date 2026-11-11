"use client";

import { useId, useState } from "react";
import {
  ArrowDownUp,
  CornerLeftUp,
  FolderPlus,
  Plus,
  Search,
  SearchX,
  StickyNote,
  X,
} from "lucide-react";
import { createNote, getNote, updateNote } from "@/app/actions/note-actions";
import {
  createNoteFolder,
  deleteNoteFolder,
  moveNoteFolder,
  moveNoteToFolder,
  renameNoteFolder,
} from "@/app/actions/note-folder-actions";
import ConfirmDialog from "@/app/components/shared/confirm-dialog";
import {
  buildChildrenMap,
  buildItemsMap,
  flattenFolderOptions,
  getDescendantFolderIds,
  getVisibleFolderIds,
} from "@/lib/folder-tree";
import FolderNameDialog from "./folder-name-dialog";
import {
  FolderContents,
  type DragItem,
  type NotesTree,
} from "./folder-tree-view";
import MoveDialog from "./move-dialog";
import NoteEditorDialog, { type NoteDraft } from "./note-editor-dialog";
import {
  DEFAULT_DIRECTION,
  SORT_OPTIONS,
  directionLabel,
  sortNotes,
  type SortBy,
  type SortDirection,
} from "./note-sorting";
import type {
  ActionResult,
  MovableItem,
  NoteFolder,
  NoteSummary,
} from "./types";

type EditorState =
  | { open: false }
  | { open: true; mode: "create"; folderId: string | null }
  | { open: true; mode: "edit"; noteId: string; initial: NoteDraft };

type FolderFormState =
  | { open: false }
  | { open: true; mode: "create"; parentFolderId: string | null }
  | { open: true; mode: "rename"; folder: NoteFolder };

type MoveState = { open: false } | ({ open: true } & MovableItem);

interface NotesDashboardProps {
  notes: NoteSummary[];
  folders: NoteFolder[];
}

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

// Renders straight from props: every note and folder action calls
// revalidatePath("/notes"), which sends the updated data back to this page
export default function NotesDashboard({
  notes,
  folders,
}: NotesDashboardProps) {
  const [editor, setEditor] = useState<EditorState>({ open: false });
  const [folderForm, setFolderForm] = useState<FolderFormState>({
    open: false,
  });
  const [move, setMove] = useState<MoveState>({ open: false });
  const [folderToDelete, setFolderToDelete] = useState<NoteFolder | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [openingNoteId, setOpeningNoteId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  // A dragged folder can't be dropped into itself or any of its subfolders
  const [blockedTargets, setBlockedTargets] = useState<Set<string>>(new Set());
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isOverTopLevel, setIsOverTopLevel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    DEFAULT_DIRECTION.updatedAt,
  );
  const sortSelectId = useId();

  const folderById = new Map(folders.map((folder) => [folder.id, folder]));

  // For actions without a dialog of their own (drag and drop, folder delete)
  const runAction = async (task: () => Promise<ActionResult>) => {
    setError(null);
    const result = await task();
    if (!result.success) setError(result.message);
  };

  const expand = (folderId: string | null) => {
    if (!folderId) return;
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.delete(folderId);
      return next;
    });
  };

  // ── Notes ──────────────────────────────────────────────────────────────────

  const openEditor = async (noteId: string) => {
    setError(null);
    setOpeningNoteId(noteId);
    const result = await getNote(noteId);
    setOpeningNoteId(null);

    if (!result.success || !result.note) {
      setError(result.message ?? "Could not open the note");
      return;
    }

    setEditor({
      open: true,
      mode: "edit",
      noteId,
      initial: { title: result.note.title, content: result.note.content },
    });
  };

  const newNote = (folderId: string | null) => {
    expand(folderId);
    setEditor({ open: true, mode: "create", folderId });
  };

  const saveNote = async (draft: NoteDraft): Promise<ActionResult> => {
    if (!editor.open) return { success: false, message: "No note is open" };
    return editor.mode === "create"
      ? createNote(draft.title, draft.content, editor.folderId)
      : updateNote(editor.noteId, draft);
  };

  // ── Folders ────────────────────────────────────────────────────────────────

  const newFolder = (parentFolderId: string | null) => {
    expand(parentFolderId);
    setFolderForm({ open: true, mode: "create", parentFolderId });
  };

  const saveFolder = async (name: string): Promise<ActionResult> => {
    if (!folderForm.open) return { success: false, message: "No folder open" };
    return folderForm.mode === "create"
      ? createNoteFolder(name, folderForm.parentFolderId)
      : renameNoteFolder(folderForm.folder.id, name);
  };

  const deleteFolder = async () => {
    if (!folderToDelete) return;
    const { id } = folderToDelete;
    setFolderToDelete(null);
    setDeletingFolderId(id);
    await runAction(() => deleteNoteFolder(id));
    setDeletingFolderId(null);
  };

  const deleteFolderMessage = (folder: NoteFolder) => {
    const subfolderIds = getDescendantFolderIds(folders, folder.id);
    const noteCount = notes.filter(
      (note) =>
        note.folderId === folder.id ||
        (note.folderId !== null && subfolderIds.has(note.folderId)),
    ).length;

    if (noteCount === 0 && subfolderIds.size === 0) {
      return `Delete the empty folder "${folder.name}"?`;
    }

    const contents = [
      noteCount > 0 && plural(noteCount, "note", "notes"),
      subfolderIds.size > 0 &&
        plural(subfolderIds.size, "subfolder", "subfolders"),
    ]
      .filter(Boolean)
      .join(" and ");

    return `Delete the folder "${folder.name}" and everything in it (${contents})? This action cannot be undone.`;
  };

  // ── Moving ─────────────────────────────────────────────────────────────────

  const moveItem = (item: MovableItem, targetFolderId: string | null) =>
    item.kind === "note"
      ? moveNoteToFolder(item.note.id, targetFolderId)
      : moveNoteFolder(item.folder.id, targetFolderId);

  const moveOptions = (item: MovableItem) =>
    flattenFolderOptions(
      folders,
      item.kind === "folder"
        ? new Set([
            item.folder.id,
            ...getDescendantFolderIds(folders, item.folder.id),
          ])
        : new Set<string>(),
    );

  // ── Drag and drop ──────────────────────────────────────────────────────────

  const draggedItem = (): MovableItem | null => {
    if (!dragItem) return null;
    if (dragItem.kind === "note") {
      const note = notes.find((n) => n.id === dragItem.id);
      return note ? { kind: "note", note } : null;
    }
    const folder = folderById.get(dragItem.id);
    return folder ? { kind: "folder", folder } : null;
  };

  const currentFolderOf = (item: MovableItem) =>
    item.kind === "note" ? item.note.folderId : item.folder.parentFolderId;

  const canDropOn = (targetFolderId: string | null) => {
    const item = draggedItem();
    if (!item || currentFolderOf(item) === targetFolderId) return false;
    return targetFolderId === null || !blockedTargets.has(targetFolderId);
  };

  const startDrag = (item: DragItem) => {
    setDragItem(item);
    setBlockedTargets(
      item.kind === "folder"
        ? new Set([item.id, ...getDescendantFolderIds(folders, item.id)])
        : new Set(),
    );
  };

  const endDrag = () => {
    setDragItem(null);
    setDragOverFolderId(null);
    setIsOverTopLevel(false);
  };

  const drop = (targetFolderId: string | null) => {
    const item = draggedItem();
    const allowed = canDropOn(targetFolderId);
    endDrag();
    if (item && allowed) void runAction(() => moveItem(item, targetFolderId));
  };

  // ── Search and sort ────────────────────────────────────────────────────────

  const searchTerm = search.trim().toLowerCase();
  const isSearching = searchTerm !== "";
  const visibleFolderIds = getVisibleFolderIds(folders, notes, searchTerm);
  // A matching top-level note has no folder, so it isn't in visibleFolderIds
  const hasSearchMatch =
    notes.some((note) => note.title.toLowerCase().includes(searchTerm)) ||
    folders.some((folder) => folder.name.toLowerCase().includes(searchTerm));

  const changeSort = (value: SortBy) => {
    setSortBy(value);
    setSortDirection(DEFAULT_DIRECTION[value]);
  };

  const tree: NotesTree = {
    childrenMap: buildChildrenMap(folders),
    // Notes are sorted before grouping, so every folder shows them in order
    notesMap: buildItemsMap(sortNotes(notes, sortBy, sortDirection)),
    collapsed,
    searchTerm,
    visibleFolderIds,
    hasFolders: folders.length > 0,
    openingNoteId,
    deletingFolderId,
    dragItem,
    dragOverFolderId,
    canDropOn,
    onToggleCollapse: (folderId) =>
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(folderId)) {
          next.delete(folderId);
        } else {
          next.add(folderId);
        }
        return next;
      }),
    onEditNote: (note) => openEditor(note.id),
    onMove: (item) => setMove({ open: true, ...item }),
    onNewNote: newNote,
    onNewFolder: newFolder,
    onRenameFolder: (folder) =>
      setFolderForm({ open: true, mode: "rename", folder }),
    onDeleteFolder: setFolderToDelete,
    onDragStart: startDrag,
    onDragEnd: endDrag,
    onDragOverFolder: setDragOverFolderId,
    onDragLeaveFolder: (folderId) =>
      setDragOverFolderId((prev) => (prev === folderId ? null : prev)),
    onDrop: drop,
  };

  const isEmpty = notes.length === 0 && folders.length === 0;
  const editorFolder =
    editor.open && editor.mode === "create" && editor.folderId
      ? folderById.get(editor.folderId)
      : undefined;
  const parentFolder =
    folderForm.open && folderForm.mode === "create" && folderForm.parentFolderId
      ? folderById.get(folderForm.parentFolderId)
      : undefined;

  return (
    <>
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#2c3e50]">📝 Notes</h1>
          <p className="mt-2 text-gray-600">
            {isEmpty
              ? "You don't have any notes yet."
              : [
                  plural(notes.length, "note", "notes"),
                  folders.length > 0 &&
                    plural(folders.length, "folder", "folders"),
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => newFolder(null)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <FolderPlus size={16} />
            New folder
          </button>
          <button
            onClick={() => newNote(null)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus size={16} />
            New note
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start justify-between gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            className="rounded p-0.5 hover:bg-red-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {isEmpty ? (
        <div className="flex flex-col items-center rounded-xl bg-white px-6 py-12 text-center shadow-md">
          <StickyNote size={40} className="mb-4 text-gray-300" />
          <p className="mb-1 font-medium text-[#2c3e50]">
            Keep everything for your trips in one place
          </p>
          <p className="text-sm text-gray-500">
            Packing lists, places to visit, booking details: create your first
            note or a folder to get started.
          </p>
        </div>
      ) : (
        <>
          {notes.length + folders.length > 1 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search
                  size={16}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && setSearch("")}
                  aria-label="Search notes and folders"
                  placeholder="Search notes and folders…"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pr-9 pl-9 text-sm text-gray-900 outline-none focus:border-blue-500"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-gray-400 transition-colors hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor={sortSelectId} className="text-sm text-gray-500">
                  Sort by
                </label>
                <select
                  id={sortSelectId}
                  value={sortBy}
                  onChange={(e) => changeSort(e.target.value as SortBy)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() =>
                    setSortDirection((value) =>
                      value === "asc" ? "desc" : "asc",
                    )
                  }
                  title="Reverse the order"
                  className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <ArrowDownUp size={14} />
                  {directionLabel(sortBy, sortDirection)}
                </button>
              </div>
            </div>
          )}

          {/* Only while dragging something that is inside a folder */}
          {dragItem && canDropOn(null) && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsOverTopLevel(true);
              }}
              onDragLeave={() => setIsOverTopLevel(false)}
              onDrop={(e) => {
                e.preventDefault();
                drop(null);
              }}
              className={`mb-4 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-sm font-medium transition-colors ${
                isOverTopLevel
                  ? "border-blue-400 bg-blue-50 text-blue-700"
                  : "border-gray-300 text-gray-500"
              }`}
            >
              <CornerLeftUp size={16} />
              Drop here to move out of its folder
            </div>
          )}

          {isSearching && !hasSearchMatch ? (
            <div className="flex flex-col items-center rounded-xl bg-white px-6 py-10 text-center shadow-md">
              <SearchX size={32} className="mb-3 text-gray-300" />
              <p className="text-sm text-gray-500">
                No notes or folders match &ldquo;{search.trim()}&rdquo;.
              </p>
            </div>
          ) : (
            <FolderContents folderId={null} tree={tree} />
          )}
        </>
      )}

      {/* Dialogs are keyed so each opening starts from fresh values. The keys
          are prefixed per dialog because sibling keys must be unique */}
      <NoteEditorDialog
        key={
          editor.open
            ? editor.mode === "edit"
              ? `editor:${editor.noteId}`
              : `editor:create:${editor.folderId}`
            : "editor:closed"
        }
        open={editor.open}
        heading={
          editor.open && editor.mode === "edit"
            ? "Edit note"
            : editorFolder
              ? `New note in "${editorFolder.name}"`
              : "New note"
        }
        initial={
          editor.open && editor.mode === "edit"
            ? editor.initial
            : { title: "", content: "" }
        }
        onSave={saveNote}
        onClose={() => setEditor({ open: false })}
      />

      <FolderNameDialog
        key={
          folderForm.open
            ? folderForm.mode === "rename"
              ? `folder:rename:${folderForm.folder.id}`
              : `folder:create:${folderForm.parentFolderId}`
            : "folder:closed"
        }
        open={folderForm.open}
        heading={
          folderForm.open && folderForm.mode === "rename"
            ? "Rename folder"
            : parentFolder
              ? `New folder in "${parentFolder.name}"`
              : "New folder"
        }
        initialName={
          folderForm.open && folderForm.mode === "rename"
            ? folderForm.folder.name
            : ""
        }
        submitLabel={
          folderForm.open && folderForm.mode === "rename" ? "Save" : "Create"
        }
        onSave={saveFolder}
        onClose={() => setFolderForm({ open: false })}
      />

      {move.open && (
        <MoveDialog
          key={`move:${move.kind === "note" ? move.note.id : move.folder.id}`}
          open
          heading={move.kind === "note" ? "Move note" : "Move folder"}
          itemName={move.kind === "note" ? move.note.title : move.folder.name}
          options={moveOptions(move)}
          currentFolderId={currentFolderOf(move)}
          onMove={(targetFolderId) => moveItem(move, targetFolderId)}
          onClose={() => setMove({ open: false })}
        />
      )}

      <ConfirmDialog
        open={folderToDelete !== null}
        message={folderToDelete ? deleteFolderMessage(folderToDelete) : ""}
        onConfirm={deleteFolder}
        onCancel={() => setFolderToDelete(null)}
      />
    </>
  );
}
