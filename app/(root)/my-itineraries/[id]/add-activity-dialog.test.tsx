import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddActivityDialog from "./add-activity-dialog";

const { addItineraryItem } = vi.hoisted(() => ({
  addItineraryItem: vi.fn(),
}));

vi.mock("@/app/actions/itinerary-actions", () => ({ addItineraryItem }));

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

const newItem = {
  id: "item-1",
  name: "Colosseum",
  city: "Rome",
  date: "2027-05-02",
  startTime: "09:00",
  endTime: "11:00",
};

beforeEach(() => {
  vi.clearAllMocks();
  addItineraryItem.mockResolvedValue({
    success: true,
    message: "Activity added",
    item: newItem,
  });
});

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof AddActivityDialog>> = {},
) {
  const props = {
    open: true,
    itineraryId: "trip-1",
    defaultCity: "Rome",
    defaultDate: "2027-05-02",
    onAdded: vi.fn(),
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

  it("adds the activity with trimmed text, then closes", async () => {
    const { onAdded, onClose } = renderDialog();
    await userEvent.type(screen.getByLabelText("Activity"), "  Colosseum ");
    setValue("Start", "09:00");
    setValue("End", "11:00");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(addItineraryItem).toHaveBeenCalledWith("trip-1", {
      name: "Colosseum",
      city: "Rome",
      date: "2027-05-02",
      startTime: "09:00",
      endTime: "11:00",
    });
    expect(onAdded).toHaveBeenCalledWith(newItem);
    expect(onClose).toHaveBeenCalled();
  });

  it("leaves out an empty date and empty times", async () => {
    renderDialog({ defaultDate: "" });
    await userEvent.type(screen.getByLabelText("Activity"), "Walk");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(addItineraryItem).toHaveBeenCalledWith("trip-1", {
      name: "Walk",
      city: "Rome",
    });
  });

  it("checks the times before sending anything to the server", async () => {
    const { onClose } = renderDialog();
    await userEvent.type(screen.getByLabelText("Activity"), "Colosseum");
    setValue("Start", "11:00");
    setValue("End", "09:00");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "End time must be after the start time",
    );
    expect(addItineraryItem).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows the server's error and stays open", async () => {
    addItineraryItem.mockResolvedValue({
      success: false,
      message: "Not authorised",
    });
    const { onAdded, onClose } = renderDialog();
    await userEvent.type(screen.getByLabelText("Activity"), "Colosseum");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Not authorised");
    expect(onAdded).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes without adding when Cancel is clicked", async () => {
    const { onClose } = renderDialog();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(addItineraryItem).not.toHaveBeenCalled();
  });
});
