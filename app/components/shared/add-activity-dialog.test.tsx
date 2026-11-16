import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddActivityDialog from "./add-activity-dialog";

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

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof AddActivityDialog>> = {},
) {
  const props = {
    open: true,
    defaultCity: "Rome",
    defaultDate: "2027-05-02",
    onSave: vi.fn().mockResolvedValue({ success: true }),
    onClose: vi.fn(),
    ...overrides,
  };
  return { ...render(<AddActivityDialog {...props} />), ...props };
}

// Date and time inputs can't be typed into character by character in jsdom
const setValue = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("AddActivityDialog", () => {
  it("prefills the city and the date", () => {
    renderDialog();
    expect(screen.getByLabelText("Activity")).toHaveValue("");
    expect(screen.getByLabelText("City")).toHaveValue("Rome");
    expect(screen.getByLabelText("Date")).toHaveValue("2027-05-02");
    expect(screen.getByLabelText("Start")).toHaveValue("");
    expect(screen.getByLabelText("End")).toHaveValue("");
  });

  it("disables Add until the activity has a name and a city", async () => {
    renderDialog({ defaultCity: "" });
    const add = screen.getByRole("button", { name: "Add" });
    expect(add).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Activity"), "Colosseum");
    expect(add).toBeDisabled();

    await userEvent.type(screen.getByLabelText("City"), "Rome");
    expect(add).toBeEnabled();
  });

  it("hands over the validated activity with trimmed text, then closes", async () => {
    const { onSave, onClose } = renderDialog();
    await userEvent.type(screen.getByLabelText("Activity"), "  Colosseum ");
    setValue("Start", "09:00");
    setValue("End", "11:00");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onSave).toHaveBeenCalledWith({
      name: "Colosseum",
      city: "Rome",
      date: "2027-05-02",
      startTime: "09:00",
      endTime: "11:00",
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("leaves out an empty date and empty times", async () => {
    const { onSave } = renderDialog({ defaultDate: "" });
    await userEvent.type(screen.getByLabelText("Activity"), "Walk");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onSave).toHaveBeenCalledWith({ name: "Walk", city: "Rome" });
  });

  it("checks the times before handing anything over", async () => {
    const { onSave, onClose } = renderDialog();
    await userEvent.type(screen.getByLabelText("Activity"), "Colosseum");
    setValue("Start", "11:00");
    setValue("End", "09:00");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "End time must be after the start time",
    );
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows the error from saving and stays open", async () => {
    const { onClose } = renderDialog({
      onSave: vi
        .fn()
        .mockResolvedValue({ success: false, message: "Not authorised" }),
    });
    await userEvent.type(screen.getByLabelText("Activity"), "Colosseum");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Not authorised");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes without saving when Cancel is clicked", async () => {
    const { onSave, onClose } = renderDialog();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});
