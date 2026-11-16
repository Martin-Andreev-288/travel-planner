import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ItineraryDisplay from "./itinerary";
import type { TravelItineraryItem } from "../api/chat/itinerary-store";

vi.mock("../actions/itinerary-actions", () => ({
  saveItinerary: vi.fn(),
  updateItinerary: vi.fn(),
}));

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

const items: TravelItineraryItem[] = [
  { id: "a", name: "Colosseum", city: "Rome", date: "2027-05-01" },
  { id: "b", name: "Uffizi", city: "Florence", date: "2027-05-03" },
  { id: "c", name: "Trevi Fountain", city: "Rome", date: "2027-05-02" },
];

// The panel receives its items already grouped by day, as Home does it
function grouped(list: TravelItineraryItem[]) {
  return list.reduce<Record<string, TravelItineraryItem[]>>((groups, item) => {
    const key = item.date ?? "Unscheduled";
    (groups[key] ??= []).push(item);
    return groups;
  }, {});
}

function renderPanel(
  list: TravelItineraryItem[],
  overrides: Partial<React.ComponentProps<typeof ItineraryDisplay>> = {},
) {
  const props = {
    groupedItems: grouped(list),
    itineraryItems: list,
    onUpdateItem: vi.fn(),
    onDeleteItem: vi.fn(),
    onAddItem: vi.fn(),
    ...overrides,
  };
  return { ...render(<ItineraryDisplay {...props} />), ...props };
}

// The items passed to onAddItem, in order
const addedItems = (onAddItem: unknown) =>
  vi
    .mocked(onAddItem as (item: TravelItineraryItem) => void)
    .mock.calls.map(([item]) => item);

const addDialog = () =>
  within(screen.getByLabelText("Activity").closest("dialog") as HTMLElement);

describe("ItineraryDisplay — adding activities", () => {
  it("doesn't offer adding when no handler is given", () => {
    renderPanel(items, { onAddItem: undefined });
    expect(
      screen.queryByRole("button", { name: "Add activity" }),
    ).not.toBeInTheDocument();
  });

  it("offers adding even before the trip has activities", () => {
    renderPanel([]);
    expect(
      screen.getByRole("button", { name: "Add activity" }),
    ).toBeInTheDocument();
    // Nothing to save yet
    expect(
      screen.queryByRole("button", { name: /Save Itinerary/ }),
    ).not.toBeInTheDocument();
  });

  it("prefills the most common city and the trip's last day", async () => {
    renderPanel(items);
    await userEvent.click(screen.getByRole("button", { name: "Add activity" }));
    expect(screen.getByLabelText("City")).toHaveValue("Rome");
    expect(screen.getByLabelText("Date")).toHaveValue("2027-05-03");
  });

  it("adds the activity to the panel's list with a new manual id", async () => {
    const { onAddItem } = renderPanel(items);
    await userEvent.click(screen.getByRole("button", { name: "Add activity" }));
    await userEvent.type(screen.getByLabelText("Activity"), " Pantheon ");
    fireEvent.change(screen.getByLabelText("Start"), {
      target: { value: "15:00" },
    });
    await userEvent.click(addDialog().getByRole("button", { name: "Add" }));

    expect(onAddItem).toHaveBeenCalledOnce();
    const [item] = addedItems(onAddItem);
    expect(item).toEqual({
      id: expect.stringMatching(/^manual-[\w-]{8}$/),
      name: "Pantheon",
      city: "Rome",
      date: "2027-05-03",
      startTime: "15:00",
    });
  });

  it("gives every added activity its own id", async () => {
    const { onAddItem } = renderPanel(items);
    for (const name of ["Pantheon", "Borghese"]) {
      await userEvent.click(
        screen.getByRole("button", { name: "Add activity" }),
      );
      await userEvent.type(screen.getByLabelText("Activity"), name);
      await userEvent.click(addDialog().getByRole("button", { name: "Add" }));
    }
    const [first, second] = addedItems(onAddItem).map((item) => item.id);
    expect(first).not.toBe(second);
  });

  it("doesn't add anything when the form is invalid", async () => {
    const { onAddItem } = renderPanel(items);
    await userEvent.click(screen.getByRole("button", { name: "Add activity" }));
    await userEvent.type(screen.getByLabelText("Activity"), "Pantheon");
    fireEvent.change(screen.getByLabelText("Start"), {
      target: { value: "15:00" },
    });
    fireEvent.change(screen.getByLabelText("End"), {
      target: { value: "14:00" },
    });
    await userEvent.click(addDialog().getByRole("button", { name: "Add" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "End time must be after the start time",
    );
    expect(onAddItem).not.toHaveBeenCalled();
  });
});
