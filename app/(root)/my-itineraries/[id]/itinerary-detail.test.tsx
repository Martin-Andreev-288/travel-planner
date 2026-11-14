import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ItineraryDetail from "./itinerary-detail";

const { actions } = vi.hoisted(() => ({
  actions: {
    addItineraryItem: vi.fn(),
    updateItineraryItem: vi.fn(),
    deleteItineraryItem: vi.fn(),
  },
}));

vi.mock("@/app/actions/itinerary-actions", () => actions);

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

beforeEach(() => {
  vi.clearAllMocks();
});

const items = [
  { id: "a", name: "Colosseum", city: "Rome", date: "2027-05-01" },
  { id: "b", name: "Uffizi", city: "Florence", date: "2027-05-03" },
  { id: "c", name: "Trevi Fountain", city: "Rome", date: "2027-05-02" },
];

const addDialog = () =>
  within(screen.getByLabelText("Activity").closest("dialog") as HTMLElement);

describe("ItineraryDetail — adding activities", () => {
  it("shows an empty state for a trip without activities", () => {
    render(<ItineraryDetail id="trip-1" title="Weekend in Rome" items={[]} />);
    expect(
      screen.getByText("This trip has no activities yet"),
    ).toBeInTheDocument();
    // Nothing to continue planning with yet
    expect(
      screen.queryByRole("link", { name: /Continue Planning/ }),
    ).not.toBeInTheDocument();
  });

  it("adds the first activity to an empty trip", async () => {
    actions.addItineraryItem.mockResolvedValue({
      success: true,
      message: "Activity added",
      item: {
        id: "new",
        name: "Colosseum",
        city: "Rome",
        startTime: "09:00",
      },
    });
    render(<ItineraryDetail id="trip-1" title="Weekend in Rome" items={[]} />);

    await userEvent.click(screen.getByRole("button", { name: "Add activity" }));
    await userEvent.type(screen.getByLabelText("Activity"), "Colosseum");
    await userEvent.type(screen.getByLabelText("City"), "Rome");
    await userEvent.click(addDialog().getByRole("button", { name: "Add" }));

    expect(actions.addItineraryItem).toHaveBeenCalledWith("trip-1", {
      name: "Colosseum",
      city: "Rome",
    });
    expect(screen.getByText("Colosseum")).toBeInTheDocument();
    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(
      screen.queryByText("This trip has no activities yet"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Continue Planning/ }),
    ).toBeInTheDocument();
  });

  it("prefills the most common city and the trip's last day", async () => {
    render(<ItineraryDetail id="trip-1" title="Italy" items={items} />);
    await userEvent.click(screen.getByRole("button", { name: "Add activity" }));

    expect(screen.getByLabelText("City")).toHaveValue("Rome");
    expect(screen.getByLabelText("Date")).toHaveValue("2027-05-03");
  });

  it("opens the form empty every time", async () => {
    render(<ItineraryDetail id="trip-1" title="Italy" items={items} />);
    await userEvent.click(screen.getByRole("button", { name: "Add activity" }));
    await userEvent.type(screen.getByLabelText("Activity"), "Pantheon");
    await userEvent.click(addDialog().getByRole("button", { name: "Cancel" }));

    await userEvent.click(screen.getByRole("button", { name: "Add activity" }));
    expect(screen.getByLabelText("Activity")).toHaveValue("");
  });
});
