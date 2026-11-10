"use client";

import {
  ChevronRight,
  FilePlus,
  Folder,
  FolderInput,
  FolderOpen,
  FolderPlus,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import NoteCard from "./note-card";
import type { MovableItem, NoteFolder, NoteSummary } from "./types";

export type DragItem = { kind: "note" | "folder"; id: string };

// Everything the recursive tree needs, passed down as one object
export type NotesTree = {
  childrenMap: Map<string | null, NoteFolder[]>;
  notesMap: Map<string | null, NoteSummary[]>;
  collapsed: Set<string>;
  hasFolders: boolean;
  openingNoteId: string | null;
  deletingFolderId: string | null;
  dragItem: DragItem | null;
  dragOverFolderId: string | null;
  canDropOn: (folderId: string | null) => boolean;
  onToggleCollapse: (folderId: string) => void;
  onEditNote: (note: NoteSummary) => void;
  onMove: (item: MovableItem) => void;
  onNewNote: (folderId: string) => void;
  onNewFolder: (parentFolderId: string) => void;
  onRenameFolder: (folder: NoteFolder) => void;
  onDeleteFolder: (folder: NoteFolder) => void;
  onDragStart: (item: DragItem) => void;
  onDragEnd: () => void;
  onDragOverFolder: (folderId: string) => void;
  onDragLeaveFolder: (folderId: string) => void;
  onDrop: (folderId: string | null) => void;
};

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

// A folder's own notes first, then its subfolders, so the notes stay right
// under the folder's name instead of below every expanded subfolder
export function FolderContents({
  folderId,
  tree,
}: {
  folderId: string | null;
  tree: NotesTree;
}) {
  const notes = tree.notesMap.get(folderId) ?? [];
  const childFolders = tree.childrenMap.get(folderId) ?? [];

  if (folderId && notes.length === 0 && childFolders.length === 0) {
    return (
      <p className="py-1 text-sm text-gray-400 italic">This folder is empty</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {notes.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              isOpening={tree.openingNoteId === note.id}
              isDragging={
                tree.dragItem?.kind === "note" && tree.dragItem.id === note.id
              }
              onEdit={() => tree.onEditNote(note)}
              onMove={
                tree.hasFolders
                  ? () => tree.onMove({ kind: "note", note })
                  : undefined
              }
              onDragStart={() =>
                tree.onDragStart({ kind: "note", id: note.id })
              }
              onDragEnd={tree.onDragEnd}
            />
          ))}
        </div>
      )}

      {childFolders.length > 0 && (
        <div className="flex flex-col gap-3">
          {childFolders.map((folder) => (
            <FolderItem key={folder.id} folder={folder} tree={tree} />
          ))}
        </div>
      )}
    </div>
  );
}

function FolderItem({ folder, tree }: { folder: NoteFolder; tree: NotesTree }) {
  const isCollapsed = tree.collapsed.has(folder.id);
  const isDragging =
    tree.dragItem?.kind === "folder" && tree.dragItem.id === folder.id;
  const isDropTarget = tree.dragOverFolderId === folder.id;
  const isDeleting = tree.deletingFolderId === folder.id;
  const noteCount = tree.notesMap.get(folder.id)?.length ?? 0;
  const folderCount = tree.childrenMap.get(folder.id)?.length ?? 0;

  const summary =
    noteCount === 0 && folderCount === 0
      ? "Empty"
      : [
          noteCount > 0 && countLabel(noteCount, "note", "notes"),
          folderCount > 0 && countLabel(folderCount, "folder", "folders"),
        ]
          .filter(Boolean)
          .join(" · ");

  const iconButton =
    "rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 disabled:opacity-50";

  return (
    <div>
      <div
        draggable={!isDeleting}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          // Firefox only starts a drag when some data is set
          e.dataTransfer.setData("text/plain", folder.id);
          tree.onDragStart({ kind: "folder", id: folder.id });
        }}
        onDragEnd={tree.onDragEnd}
        onDragOver={(e) => {
          // Only valid targets accept the drop (and show the highlight)
          if (!tree.canDropOn(folder.id)) return;
          e.preventDefault();
          tree.onDragOverFolder(folder.id);
        }}
        onDragLeave={() => tree.onDragLeaveFolder(folder.id)}
        onDrop={(e) => {
          e.preventDefault();
          tree.onDrop(folder.id);
        }}
        className={`flex cursor-grab items-center gap-2 rounded-xl px-3 py-2.5 shadow-sm transition active:cursor-grabbing ${
          isDropTarget
            ? "bg-blue-50 ring-2 ring-blue-400"
            : "bg-white ring-1 ring-gray-200"
        } ${isDragging || isDeleting ? "opacity-50" : ""}`}
      >
        <button
          onClick={() => tree.onToggleCollapse(folder.id)}
          aria-expanded={!isCollapsed}
          aria-label={`${isCollapsed ? "Expand" : "Collapse"} folder ${folder.name}`}
          className="rounded-md p-0.5 text-gray-500 transition-colors hover:bg-gray-100"
        >
          <ChevronRight
            size={16}
            className={`transition-transform ${isCollapsed ? "" : "rotate-90"}`}
          />
        </button>
        {isCollapsed ? (
          <Folder size={18} className="shrink-0 text-blue-500" />
        ) : (
          <FolderOpen size={18} className="shrink-0 text-blue-500" />
        )}
        <span className="min-w-0 flex-1 truncate font-semibold text-[#2c3e50]">
          {folder.name}
        </span>
        <span className="hidden shrink-0 text-xs text-gray-400 sm:inline">
          {summary}
        </span>

        <div className="flex shrink-0 items-center">
          <button
            onClick={() => tree.onNewNote(folder.id)}
            disabled={isDeleting}
            aria-label={`New note in ${folder.name}`}
            title="New note in this folder"
            className={`${iconButton} hover:text-blue-600`}
          >
            <FilePlus size={15} />
          </button>
          <button
            onClick={() => tree.onNewFolder(folder.id)}
            disabled={isDeleting}
            aria-label={`New folder in ${folder.name}`}
            title="New subfolder"
            className={`${iconButton} hover:text-blue-600`}
          >
            <FolderPlus size={15} />
          </button>
          <button
            onClick={() => tree.onMove({ kind: "folder", folder })}
            disabled={isDeleting}
            aria-label={`Move folder ${folder.name}`}
            title="Move folder"
            className={`${iconButton} hover:text-gray-700`}
          >
            <FolderInput size={15} />
          </button>
          <button
            onClick={() => tree.onRenameFolder(folder)}
            disabled={isDeleting}
            aria-label={`Rename folder ${folder.name}`}
            title="Rename folder"
            className={`${iconButton} hover:text-gray-700`}
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => tree.onDeleteFolder(folder)}
            disabled={isDeleting}
            aria-label={`Delete folder ${folder.name}`}
            title="Delete folder"
            className={`${iconButton} hover:text-red-600`}
          >
            {isDeleting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Trash2 size={15} />
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="mt-3 ml-3 border-l-2 border-gray-200 pl-4">
          <FolderContents folderId={folder.id} tree={tree} />
        </div>
      )}
    </div>
  );
}
