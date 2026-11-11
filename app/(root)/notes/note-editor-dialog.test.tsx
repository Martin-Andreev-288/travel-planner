import { act, render, screen } from "@testing-library/react";
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
  // Undo the fullscreen support some tests switch on
  delete (document as { fullscreenEnabled?: boolean }).fullscreenEnabled;
  delete (document as { fullscreenElement?: Element }).fullscreenElement;
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

  // ── Markdown preview ────────────────────────────────────────────────────────

  describe("preview", () => {
    const markdown = [
      "# Berlin",
      "",
      "Visit **Museum Island**, see [the map](https://example.com/map).",
      "",
      "| Day | Plan |",
      "| --- | ---- |",
      "| 1   | Mitte |",
      "",
      "~~Cancelled tour~~",
    ].join("\n");

    const openPreview = async (content: string) => {
      renderEditor({ initial: { title: "Berlin", content } });
      await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    };

    it("renders the content as Markdown", async () => {
      await openPreview(markdown);
      expect(
        screen.getByRole("heading", { level: 1, name: "Berlin" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Museum Island").tagName).toBe("STRONG");
    });

    it("supports GitHub-flavoured Markdown: tables and strikethrough", async () => {
      await openPreview(markdown);
      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getByRole("cell", { name: "Mitte" })).toBeInTheDocument();
      expect(screen.getByText("Cancelled tour").tagName).toBe("DEL");
    });

    it("opens links in a new tab", async () => {
      await openPreview(markdown);
      const link = screen.getByRole("link", { name: "the map" });
      expect(link).toHaveAttribute("href", "https://example.com/map");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noreferrer");
    });

    it("says there is nothing to preview for empty content", async () => {
      await openPreview("   ");
      expect(screen.getByText("Nothing to preview yet.")).toBeInTheDocument();
    });

    it("goes back to editing with the text kept", async () => {
      await openPreview("Some **text**");
      expect(screen.queryByLabelText("Content")).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Write" }));
      expect(screen.getByLabelText("Content")).toHaveValue("Some **text**");
      expect(screen.getByRole("button", { name: "Write" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });
  });

  // ── Expand and fullscreen ───────────────────────────────────────────────────

  it("expands and shrinks the editor", async () => {
    renderEditor();
    const dialog = document.querySelector("dialog") as HTMLDialogElement;
    expect(dialog).toHaveClass("max-w-2xl");

    await userEvent.click(
      screen.getByRole("button", { name: "Expand editor" }),
    );
    expect(dialog).toHaveClass("max-w-5xl");

    await userEvent.click(
      screen.getByRole("button", { name: "Shrink editor" }),
    );
    expect(dialog).toHaveClass("max-w-2xl");
  });

  it("hides the fullscreen button when the browser doesn't support it", () => {
    renderEditor();
    expect(
      screen.queryByRole("button", { name: "Read in fullscreen" }),
    ).not.toBeInTheDocument();
  });

  it("switches to the preview and opens it in fullscreen", async () => {
    Object.defineProperty(document, "fullscreenEnabled", {
      value: true,
      configurable: true,
    });
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    HTMLElement.prototype.requestFullscreen = requestFullscreen;

    renderEditor({ initial: { title: "Berlin", content: "# Day 1" } });
    await userEvent.click(
      screen.getByRole("button", { name: "Read in fullscreen" }),
    );

    expect(screen.getByRole("button", { name: "Preview" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(requestFullscreen).toHaveBeenCalledOnce();
    expect(requestFullscreen.mock.contexts[0]).toContainElement(
      screen.getByRole("heading", { name: "Day 1" }),
    );
  });

  it("uses the full screen width with larger text while in fullscreen", async () => {
    Object.defineProperty(document, "fullscreenEnabled", {
      value: true,
      configurable: true,
    });
    HTMLElement.prototype.requestFullscreen = vi
      .fn()
      .mockResolvedValue(undefined);

    renderEditor({ initial: { title: "Berlin", content: "# Day 1" } });
    await userEvent.click(
      screen.getByRole("button", { name: "Read in fullscreen" }),
    );
    const markdown = screen.getByRole("heading", { name: "Day 1" })
      .parentElement as HTMLElement;
    expect(markdown).toHaveClass("prose-sm", "max-w-none");

    // Simulate the browser entering fullscreen on the preview
    const preview = markdown.parentElement as HTMLElement;
    Object.defineProperty(document, "fullscreenElement", {
      value: preview,
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event("fullscreenchange"));
    });

    expect(markdown).toHaveClass("prose-lg", "max-w-none");
    expect(markdown).not.toHaveClass("prose-sm");
    expect(preview).toHaveClass("h-screen");
    expect(
      screen.getByRole("button", { name: "Exit fullscreen" }),
    ).toBeInTheDocument();
  });
});
