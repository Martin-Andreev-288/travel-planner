import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MoveDialog from "./move-dialog";

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

const options = [
  { id: "europe", name: "Europe", depth: 0 },
  { id: "berlin", name: "Berlin", depth: 1 },
];

function renderMove(
  overrides: Partial<React.ComponentProps<typeof MoveDialog>> = {},
) {
  const props = {
    open: true,
    heading: "Move note",
    itemName: "Packing list",
    options,
    currentFolderId: null,
    onMove: vi.fn().mockResolvedValue({ success: true, message: "Moved" }),
    onClose: vi.fn(),
    ...overrides,
  };
  return { ...render(<MoveDialog {...props} />), ...props };
}

describe("MoveDialog", () => {
  it("shows the heading and the name of the item being moved", () => {
    renderMove();
    expect(screen.getByText("Move note")).toBeInTheDocument();
    expect(screen.getByText("Packing list")).toBeInTheDocument();
  });

  it("offers the top level and every folder, indented by depth", () => {
    renderMove();
    const labels = screen
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(labels).toEqual(["Top level (no folder)", "Europe", "— Berlin"]);
  });

  it("preselects the current folder and disables Move until it changes", async () => {
    renderMove({ currentFolderId: "berlin" });
    expect(screen.getByLabelText("Move to")).toHaveValue("berlin");
    const move = screen.getByRole("button", { name: "Move" });
    expect(move).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText("Move to"), "europe");
    expect(move).toBeEnabled();
  });

  it("moves into the chosen folder, then closes", async () => {
    const { onMove, onClose } = renderMove();
    await userEvent.selectOptions(screen.getByLabelText("Move to"), "berlin");
    await userEvent.click(screen.getByRole("button", { name: "Move" }));
    expect(onMove).toHaveBeenCalledWith("berlin");
    expect(onClose).toHaveBeenCalled();
  });

  it("passes null when moving to the top level", async () => {
    const { onMove } = renderMove({ currentFolderId: "berlin" });
    await userEvent.selectOptions(screen.getByLabelText("Move to"), "");
    await userEvent.click(screen.getByRole("button", { name: "Move" }));
    expect(onMove).toHaveBeenCalledWith(null);
  });

  it("shows the error and stays open when moving fails", async () => {
    const { onClose } = renderMove({
      onMove: vi
        .fn()
        .mockResolvedValue({ success: false, message: "Folder not found" }),
    });
    await userEvent.selectOptions(screen.getByLabelText("Move to"), "europe");
    await userEvent.click(screen.getByRole("button", { name: "Move" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Folder not found");
    expect(onClose).not.toHaveBeenCalled();
  });
});
