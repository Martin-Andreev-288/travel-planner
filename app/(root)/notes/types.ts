export type NoteSummary = {
  id: string;
  title: string;
  preview: string;
  updatedOn: string;
  folderId: string | null;
};

export type NoteFolder = {
  id: string;
  name: string;
  parentFolderId: string | null;
  order: number;
};

// What is being dragged, or moved through the Move dialog
export type MovableItem =
  | { kind: "note"; note: NoteSummary }
  | { kind: "folder"; folder: NoteFolder };

// Result shape shared by every note and folder server action
export type ActionResult = { success: boolean; message: string };
