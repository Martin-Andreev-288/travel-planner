import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NoteEditorDialog from "./note-editor-dialog";

// jsdom does not implement showModal/close on <dialog> — provide minimal stubs
// that also keep the el.open attribute in sync so the useEffect guard works.
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

afterEach(() => {
  vi.clearAllMocks();
});

function renderEditor(
  overrides: Partial<React.ComponentProps<typeof NoteEditorDialog>> = {},
) {
  const props = {
    open: true,
    heading: "New note",
    initial: { title: "", content: "" },
    onSave: vi.fn().mockResolvedValue({ success: true, message: "Saved" }),
    onClose: vi.fn(),
    ...overrides,
  };
  return { ...render(<NoteEditorDialog {...props} />), ...props };
}

describe("NoteEditorDialog", () => {
  it("opens as a modal when open is true", () => {
    renderEditor();
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce();
    expect(screen.getByText("New note")).toBeInTheDocument();
  });

  it("does not open when open is false", () => {
    renderEditor({ open: false });
    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();
  });

  it("prefills the fields with the note being edited", () => {
    renderEditor({
      heading: "Edit note",
      initial: { title: "Berlin", content: "Museum Island" },
    });
    expect(screen.getByLabelText("Title")).toHaveValue("Berlin");
    expect(screen.getByLabelText("Content")).toHaveValue("Museum Island");
  });

  it("disables Save until the title has text", async () => {
    renderEditor();
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Title"), "   ");
    expect(save).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Title"), "Ideas");
    expect(save).toBeEnabled();
  });

  it("saves the title and content, then closes", async () => {
    const { onSave, onClose } = renderEditor();

    await userEvent.type(screen.getByLabelText("Title"), "Packing list");
    await userEvent.type(screen.getByLabelText("Content"), "Passport");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith({
      title: "Packing list",
      content: "Passport",
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("shows the error and stays open when saving fails", async () => {
    const { onClose } = renderEditor({
      initial: { title: "Ideas", content: "" },
      onSave: vi
        .fn()
        .mockResolvedValue({ success: false, message: "Not authenticated" }),
    });

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Not authenticated");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes without saving when Cancel is clicked", async () => {
    const { onSave, onClose } = renderEditor();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("closes without saving when the X button is clicked", async () => {
    const { onSave, onClose } = renderEditor();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});
