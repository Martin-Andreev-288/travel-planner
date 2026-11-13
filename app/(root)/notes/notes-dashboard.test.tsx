import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotesDashboard from "./notes-dashboard";
import type { NoteFolder, NoteSummary } from "./types";

const { noteActions, folderActions } = vi.hoisted(() => ({
  noteActions: {
    createNote: vi.fn(),
    getNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
  },
  folderActions: {
    createNoteFolder: vi.fn(),
    renameNoteFolder: vi.fn(),
    deleteNoteFolder: vi.fn(),
    moveNoteFolder: vi.fn(),
    moveNoteToFolder: vi.fn(),
  },
}));

vi.mock("@/app/actions/note-actions", () => noteActions);
vi.mock("@/app/actions/note-folder-actions", () => folderActions);

// jsdom does not implement showModal/close on <dialog>
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (
    this: HTMLDialogElement,
  ) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});

const ok = { success: true, message: "Done" };

beforeEach(() => {
  vi.clearAllMocks();
  for (const fn of [
    ...Object.values(noteActions),
    ...Object.values(folderActions),
  ]) {
    fn.mockResolvedValue(ok);
  }
});

// Berlin → Museums, plus an empty Paris folder
const folders: NoteFolder[] = [
  { id: "berlin", name: "Berlin", parentFolderId: null, order: 0 },
  { id: "museums", name: "Museums", parentFolderId: "berlin", order: 0 },
  { id: "paris", name: "Paris", parentFolderId: null, order: 1 },
];

function note(
  id: string,
  title: string,
  folderId: string | null,
  dates = { createdAt: "2026-09-01", updatedAt: "2026-09-01" },
) {
  return {
    id,
    title,
    preview: `${title} preview`,
    updatedOn: "1 September 2026",
    folderId,
    createdAt: `${dates.createdAt}T10:00:00.000Z`,
    updatedAt: `${dates.updatedAt}T10:00:00.000Z`,
  } satisfies NoteSummary;
}

const notes: NoteSummary[] = [
  note("n-root", "Packing list", null),
  note("n-berlin", "Berlin tips", "berlin"),
  note("n-museums", "Museum Island", "museums"),
];

function renderDashboard(
  props: Partial<React.ComponentProps<typeof NotesDashboard>> = {},
) {
  return render(<NotesDashboard notes={notes} folders={folders} {...props} />);
}

// Helpers to reach the dialog that contains a given element
const dialogOf = (element: HTMLElement) =>
  within(element.closest("dialog") as HTMLElement);
const folderDialog = () => dialogOf(screen.getByLabelText("Folder name"));
const editorDialog = () => dialogOf(screen.getByLabelText("Content"));

// The draggable element of a note card / folder row
const noteCard = (title: string) =>
  screen.getByText(title).closest("[draggable]") as HTMLElement;
const folderRow = (name: string) =>
  screen
    .getByRole("button", { name: `Collapse folder ${name}` })
    .closest("[draggable]") as HTMLElement;

const dataTransfer = () => ({ setData: vi.fn(), effectAllowed: "" });

function drag(source: HTMLElement, target: HTMLElement) {
  fireEvent.dragStart(source, { dataTransfer: dataTransfer() });
  fireEvent.dragOver(target, { dataTransfer: dataTransfer() });
  fireEvent.drop(target, { dataTransfer: dataTransfer() });
}

describe("NotesDashboard", () => {
  it("shows the note and folder counts", () => {
    renderDashboard();
    expect(screen.getByText("3 notes · 3 folders")).toBeInTheDocument();
  });

  it("shows the empty state when there are no notes and no folders", () => {
    renderDashboard({ notes: [], folders: [] });
    expect(
      screen.getByText("You don't have any notes yet."),
    ).toBeInTheDocument();
  });

  it("renders notes inside their folders, at any depth", () => {
    renderDashboard();
    expect(screen.getByText("Packing list")).toBeInTheDocument();
    expect(screen.getByText("Berlin tips")).toBeInTheDocument();
    expect(screen.getByText("Museum Island")).toBeInTheDocument();
    expect(screen.getByText("This folder is empty")).toBeInTheDocument();
  });

  it("summarises each folder's direct contents", () => {
    renderDashboard();
    expect(
      within(folderRow("Berlin")).getByText("1 note · 1 folder"),
    ).toBeInTheDocument();
    expect(within(folderRow("Paris")).getByText("Empty")).toBeInTheDocument();
  });

  it("collapses and expands a folder", async () => {
    renderDashboard();
    await userEvent.click(
      screen.getByRole("button", { name: "Collapse folder Berlin" }),
    );
    expect(screen.queryByText("Berlin tips")).not.toBeInTheDocument();
    expect(screen.queryByText("Museum Island")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Expand folder Berlin" }),
    );
    expect(screen.getByText("Berlin tips")).toBeInTheDocument();
  });

  it("hides the Move button on notes when there are no folders", () => {
    renderDashboard({ folders: [], notes: [note("n1", "Packing list", null)] });
    expect(
      within(noteCard("Packing list")).queryByRole("button", { name: "Move" }),
    ).not.toBeInTheDocument();
  });

  // ── Creating ────────────────────────────────────────────────────────────────

  it("creates a note inside a folder", async () => {
    renderDashboard();
    await userEvent.click(
      screen.getByRole("button", { name: "New note in Paris" }),
    );
    expect(editorDialog().getByText('New note in "Paris"')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Title"), "Louvre");
    await userEvent.click(editorDialog().getByRole("button", { name: "Save" }));

    expect(noteActions.createNote).toHaveBeenCalledWith("Louvre", "", "paris");
  });

  it("creates a top-level note from the header", async () => {
    renderDashboard();
    await userEvent.click(screen.getByRole("button", { name: "New note" }));
    await userEvent.type(screen.getByLabelText("Title"), "Ideas");
    await userEvent.click(editorDialog().getByRole("button", { name: "Save" }));
    expect(noteActions.createNote).toHaveBeenCalledWith("Ideas", "", null);
  });

  it("creates a top-level folder from the header", async () => {
    renderDashboard();
    await userEvent.click(screen.getByRole("button", { name: "New folder" }));
    await userEvent.type(screen.getByLabelText("Folder name"), "Rome");
    await userEvent.click(
      folderDialog().getByRole("button", { name: "Create" }),
    );
    expect(folderActions.createNoteFolder).toHaveBeenCalledWith("Rome", null);
  });

  it("creates a subfolder", async () => {
    renderDashboard();
    await userEvent.click(
      screen.getByRole("button", { name: "New folder in Berlin" }),
    );
    expect(
      folderDialog().getByText('New folder in "Berlin"'),
    ).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Folder name"), "Food");
    await userEvent.click(
      folderDialog().getByRole("button", { name: "Create" }),
    );
    expect(folderActions.createNoteFolder).toHaveBeenCalledWith(
      "Food",
      "berlin",
    );
  });

  it("expands a collapsed folder when creating something inside it", async () => {
    renderDashboard();
    await userEvent.click(
      screen.getByRole("button", { name: "Collapse folder Berlin" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "New note in Berlin" }),
    );
    expect(screen.getByText("Berlin tips")).toBeInTheDocument();
  });

  // ── Renaming and deleting ───────────────────────────────────────────────────

  it("renames a folder", async () => {
    renderDashboard();
    await userEvent.click(
      screen.getByRole("button", { name: "Rename folder Paris" }),
    );
    const input = screen.getByLabelText("Folder name");
    expect(input).toHaveValue("Paris");
    await userEvent.clear(input);
    await userEvent.type(input, "Lyon");
    await userEvent.click(folderDialog().getByRole("button", { name: "Save" }));
    expect(folderActions.renameNoteFolder).toHaveBeenCalledWith(
      "paris",
      "Lyon",
    );
  });

  it("asks before deleting a folder, naming what's inside it", async () => {
    renderDashboard();
    await userEvent.click(
      screen.getByRole("button", { name: "Delete folder Berlin" }),
    );
    const message = screen.getByText(
      'Delete the folder "Berlin" and everything in it (2 notes and 1 subfolder)? This action cannot be undone.',
    );
    await userEvent.click(
      dialogOf(message).getByRole("button", { name: "Delete" }),
    );
    expect(folderActions.deleteNoteFolder).toHaveBeenCalledWith("berlin");
  });

  it("uses a short message for an empty folder", async () => {
    renderDashboard();
    await userEvent.click(
      screen.getByRole("button", { name: "Delete folder Paris" }),
    );
    expect(
      screen.getByText('Delete the empty folder "Paris"?'),
    ).toBeInTheDocument();
  });

  it("shows an error from a failed action and lets you dismiss it", async () => {
    folderActions.deleteNoteFolder.mockResolvedValue({
      success: false,
      message: "Folder not found",
    });
    renderDashboard();
    await userEvent.click(
      screen.getByRole("button", { name: "Delete folder Paris" }),
    );
    const message = screen.getByText('Delete the empty folder "Paris"?');
    await userEvent.click(
      dialogOf(message).getByRole("button", { name: "Delete" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Folder not found",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Dismiss error" }),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // ── Moving with the dialog ──────────────────────────────────────────────────

  it("moves a note into another folder with the Move dialog", async () => {
    renderDashboard();
    await userEvent.click(
      within(noteCard("Packing list")).getByRole("button", { name: "Move" }),
    );
    await userEvent.selectOptions(screen.getByLabelText("Move to"), "museums");
    await userEvent.click(
      dialogOf(screen.getByLabelText("Move to")).getByRole("button", {
        name: "Move",
      }),
    );
    expect(folderActions.moveNoteToFolder).toHaveBeenCalledWith(
      "n-root",
      "museums",
    );
  });

  it("doesn't offer a folder's own subtree as a destination", async () => {
    renderDashboard();
    await userEvent.click(
      screen.getByRole("button", { name: "Move folder Berlin" }),
    );
    const options = within(screen.getByLabelText("Move to"))
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(options).toEqual(["Top level (no folder)", "Paris"]);
  });

  // ── Drag and drop ───────────────────────────────────────────────────────────

  it("moves a note by dropping it on a folder", () => {
    renderDashboard();
    drag(noteCard("Packing list"), folderRow("Paris"));
    expect(folderActions.moveNoteToFolder).toHaveBeenCalledWith(
      "n-root",
      "paris",
    );
  });

  it("moves a folder by dropping it on another folder", () => {
    renderDashboard();
    drag(folderRow("Paris"), folderRow("Museums"));
    expect(folderActions.moveNoteFolder).toHaveBeenCalledWith(
      "paris",
      "museums",
    );
  });

  it("ignores dropping a folder into its own subfolder", () => {
    renderDashboard();
    drag(folderRow("Berlin"), folderRow("Museums"));
    expect(folderActions.moveNoteFolder).not.toHaveBeenCalled();
  });

  it("ignores dropping a note on the folder it's already in", () => {
    renderDashboard();
    drag(noteCard("Berlin tips"), folderRow("Berlin"));
    expect(folderActions.moveNoteToFolder).not.toHaveBeenCalled();
  });

  it("offers a top-level drop zone only for items inside a folder", () => {
    renderDashboard();
    fireEvent.dragStart(noteCard("Packing list"), {
      dataTransfer: dataTransfer(),
    });
    expect(
      screen.queryByText("Drop here to move out of its folder"),
    ).not.toBeInTheDocument();
    fireEvent.dragEnd(noteCard("Packing list"));

    fireEvent.dragStart(noteCard("Museum Island"), {
      dataTransfer: dataTransfer(),
    });
    const zone = screen.getByText("Drop here to move out of its folder");
    fireEvent.dragOver(zone, { dataTransfer: dataTransfer() });
    fireEvent.drop(zone, { dataTransfer: dataTransfer() });

    expect(folderActions.moveNoteToFolder).toHaveBeenCalledWith(
      "n-museums",
      null,
    );
  });

  // ── Search ──────────────────────────────────────────────────────────────────

  describe("search", () => {
    const searchBox = () =>
      screen.getByRole("textbox", { name: "Search notes and folders" });

    it("isn't offered when there is only one note", () => {
      renderDashboard({
        notes: [note("n1", "Packing list", null)],
        folders: [],
      });
      expect(
        screen.queryByRole("textbox", { name: "Search notes and folders" }),
      ).not.toBeInTheDocument();
    });

    it("shows matching notes together with the folders leading to them", async () => {
      renderDashboard();
      await userEvent.type(searchBox(), "museum");

      expect(screen.getByText("Museum Island")).toBeInTheDocument();
      expect(screen.queryByText("Packing list")).not.toBeInTheDocument();
      expect(screen.queryByText("Berlin tips")).not.toBeInTheDocument();
      // Berlin and Museums lead to the match, Paris doesn't
      expect(folderRow("Berlin")).toBeInTheDocument();
      expect(folderRow("Museums")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Collapse folder Paris" }),
      ).not.toBeInTheDocument();
    });

    it("shows everything inside a folder whose name matches", async () => {
      renderDashboard();
      await userEvent.type(searchBox(), "museums");
      // "Museum Island" doesn't contain "museums", but its folder does
      expect(screen.getByText("Museum Island")).toBeInTheDocument();
      expect(screen.queryByText("Berlin tips")).not.toBeInTheDocument();
    });

    it("ignores case and surrounding spaces", async () => {
      renderDashboard();
      await userEvent.type(searchBox(), "  PACKING ");
      expect(screen.getByText("Packing list")).toBeInTheDocument();
      expect(screen.queryByText("Museum Island")).not.toBeInTheDocument();
    });

    it("says so when nothing matches", async () => {
      renderDashboard();
      await userEvent.type(searchBox(), "zzz");
      expect(
        screen.getByText("No notes or folders match “zzz”."),
      ).toBeInTheDocument();
    });

    it("expands collapsed folders while searching", async () => {
      renderDashboard();
      await userEvent.click(
        screen.getByRole("button", { name: "Collapse folder Berlin" }),
      );
      expect(screen.queryByText("Museum Island")).not.toBeInTheDocument();

      await userEvent.type(searchBox(), "museum");
      expect(screen.getByText("Museum Island")).toBeInTheDocument();
    });

    it("clears the search with the clear button and with Escape", async () => {
      renderDashboard();
      await userEvent.type(searchBox(), "museum");
      await userEvent.click(
        screen.getByRole("button", { name: "Clear search" }),
      );
      expect(searchBox()).toHaveValue("");
      expect(screen.getByText("Packing list")).toBeInTheDocument();

      await userEvent.type(searchBox(), "museum{Escape}");
      expect(searchBox()).toHaveValue("");
    });
  });

  // ── Sort ────────────────────────────────────────────────────────────────────

  describe("sort", () => {
    const sortNotes = [
      note("a", "Bravo", null, {
        createdAt: "2026-09-01",
        updatedAt: "2026-09-10",
      }),
      note("b", "Alpha", null, {
        createdAt: "2026-09-03",
        updatedAt: "2026-09-05",
      }),
      note("c", "Charlie", null, {
        createdAt: "2026-09-02",
        updatedAt: "2026-09-20",
      }),
    ];
    const order = () =>
      [...document.querySelectorAll("[draggable] h2")].map(
        (h) => h.textContent,
      );
    const renderSorted = () =>
      renderDashboard({ notes: sortNotes, folders: [] });

    it("starts with the most recently updated note first", () => {
      renderSorted();
      expect(screen.getByLabelText("Sort by")).toHaveValue("updatedAt");
      expect(order()).toEqual(["Charlie", "Bravo", "Alpha"]);
    });

    it("sorts by title A → Z, and reverses with the order button", async () => {
      renderSorted();
      await userEvent.selectOptions(screen.getByLabelText("Sort by"), "title");
      expect(order()).toEqual(["Alpha", "Bravo", "Charlie"]);

      await userEvent.click(screen.getByRole("button", { name: "A → Z" }));
      expect(order()).toEqual(["Charlie", "Bravo", "Alpha"]);
      expect(screen.getByRole("button", { name: "Z → A" })).toBeInTheDocument();
    });

    it("sorts by creation date, newest first", async () => {
      renderSorted();
      await userEvent.selectOptions(
        screen.getByLabelText("Sort by"),
        "createdAt",
      );
      expect(order()).toEqual(["Alpha", "Charlie", "Bravo"]);
      expect(
        screen.getByRole("button", { name: "Newest first" }),
      ).toBeInTheDocument();
    });
  });

  // ── Opening notes and folders ───────────────────────────────────────────────

  describe("opening", () => {
    const fullNote = (content: string) => ({
      success: true,
      note: { id: "n-root", title: "Packing list", content },
    });

    it("opens a note for reading when its card is clicked", async () => {
      noteActions.getNote.mockResolvedValue(fullNote("# Passport"));
      renderDashboard();

      await userEvent.click(screen.getByText("Packing list preview"));

      expect(noteActions.getNote).toHaveBeenCalledWith("n-root");
      const heading = await screen.findByRole("heading", {
        level: 1,
        name: "Passport",
      });
      // In Preview there is no Content textarea, so find the dialog via the note
      expect(
        dialogOf(heading).getByRole("button", { name: "Preview" }),
      ).toHaveAttribute("aria-pressed", "true");
    });

    it("opens a note from the keyboard through its title", async () => {
      noteActions.getNote.mockResolvedValue(fullNote("# Passport"));
      renderDashboard();

      screen.getByRole("button", { name: "Packing list" }).focus();
      await userEvent.keyboard("{Enter}");

      expect(noteActions.getNote).toHaveBeenCalledWith("n-root");
      expect(
        await screen.findByRole("heading", { level: 1, name: "Passport" }),
      ).toBeInTheDocument();
    });

    it("opens a note for editing with the Edit button", async () => {
      noteActions.getNote.mockResolvedValue(fullNote("# Passport"));
      renderDashboard();

      await userEvent.click(
        within(noteCard("Packing list")).getByRole("button", { name: "Edit" }),
      );

      expect(await screen.findByLabelText("Content")).toHaveValue("# Passport");
    });

    it("opens an empty note for writing, even when its card is clicked", async () => {
      noteActions.getNote.mockResolvedValue(fullNote(""));
      renderDashboard();

      await userEvent.click(screen.getByText("Packing list preview"));

      expect(await screen.findByLabelText("Content")).toHaveValue("");
    });

    it("doesn't open the note when the card's own buttons are used", async () => {
      renderDashboard();
      const card = noteCard("Packing list");

      await userEvent.click(within(card).getByRole("button", { name: "Move" }));
      await userEvent.click(
        within(card).getByRole("button", { name: "Delete" }),
      );
      const confirm = screen.getByText(
        'Are you sure you want to delete "Packing list"? This action cannot be undone.',
      );
      await userEvent.click(
        dialogOf(confirm).getByRole("button", { name: "Cancel" }),
      );

      expect(noteActions.getNote).not.toHaveBeenCalled();
    });

    it("opens and closes a folder when its name is clicked", async () => {
      renderDashboard();

      await userEvent.click(screen.getByText("Berlin"));
      expect(screen.queryByText("Berlin tips")).not.toBeInTheDocument();

      await userEvent.click(screen.getByText("Berlin"));
      expect(screen.getByText("Berlin tips")).toBeInTheDocument();
    });

    it("doesn't open or close a folder when its action buttons are used", async () => {
      renderDashboard();
      await userEvent.click(
        screen.getByRole("button", { name: "Rename folder Berlin" }),
      );
      expect(screen.getByText("Berlin tips")).toBeInTheDocument();
    });
  });
});
