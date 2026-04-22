import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmDialog from "./confirm-dialog";

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

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof ConfirmDialog>> = {},
) {
  const props = {
    open: true,
    message: "Are you sure?",
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
  return { ...render(<ConfirmDialog {...props} />), ...props };
}

describe("ConfirmDialog", () => {
  it("renders the message text", () => {
    renderDialog({ message: "Delete this item?" });
    expect(screen.getByText("Delete this item?")).toBeInTheDocument();
  });

  it("calls showModal when open is true", () => {
    renderDialog({ open: true });
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce();
  });

  it("does not call showModal when open is false", () => {
    renderDialog({ open: false });
    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();
  });

  it("calls close when open transitions from true to false", () => {
    const { rerender, onConfirm, onCancel } = renderDialog({ open: true });
    vi.clearAllMocks();
    rerender(
      <ConfirmDialog
        open={false}
        message="Are you sure?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalledOnce();
  });

  it("calls onConfirm when the Delete button is clicked", async () => {
    const { onConfirm } = renderDialog();
    await userEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("calls onCancel when the Cancel button is clicked", async () => {
    const { onCancel } = renderDialog();
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("calls onCancel when the dialog is closed via the native close event", async () => {
    const { onCancel } = renderDialog({ open: true });
    const dialog = document.querySelector("dialog")!;
    dialog.dispatchEvent(new Event("close"));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
