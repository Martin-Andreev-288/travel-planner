import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FolderNameDialog from "./folder-name-dialog";

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

afterEach(() => {
  vi.clearAllMocks();
});

function renderFolderDialog(
  overrides: Partial<React.ComponentProps<typeof FolderNameDialog>> = {},
) {
  const props = {
    open: true,
    heading: "New folder",
    initialName: "",
    submitLabel: "Create",
    onSave: vi.fn().mockResolvedValue({ success: true, message: "Saved" }),
    onClose: vi.fn(),
    ...overrides,
  };
  return { ...render(<FolderNameDialog {...props} />), ...props };
}

describe("FolderNameDialog", () => {
  it("opens as a modal with the given heading", () => {
    renderFolderDialog();
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce();
    expect(screen.getByText("New folder")).toBeInTheDocument();
  });

  it("prefills the current name when renaming", () => {
    renderFolderDialog({
      heading: "Rename folder",
      initialName: "Berlin",
      submitLabel: "Save",
    });
    expect(screen.getByLabelText("Folder name")).toHaveValue("Berlin");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("disables the submit button until the name has text", async () => {
    renderFolderDialog();
    const create = screen.getByRole("button", { name: "Create" });
    expect(create).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Folder name"), "  ");
    expect(create).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Folder name"), "Berlin");
    expect(create).toBeEnabled();
  });

  it("saves the name with Enter, then closes", async () => {
    const { onSave, onClose } = renderFolderDialog();
    await userEvent.type(screen.getByLabelText("Folder name"), "Berlin{enter}");
    expect(onSave).toHaveBeenCalledWith("Berlin");
    expect(onClose).toHaveBeenCalled();
  });

  it("shows the error and stays open when saving fails", async () => {
    const { onClose } = renderFolderDialog({
      initialName: "Berlin",
      onSave: vi
        .fn()
        .mockResolvedValue({ success: false, message: "Folder not found" }),
    });
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Folder not found");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes without saving when Cancel is clicked", async () => {
    const { onSave, onClose } = renderFolderDialog();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});
