import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewTripButton from "./new-trip-button";

const { createItinerary, push } = vi.hoisted(() => ({
  createItinerary: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/app/actions/itinerary-actions", () => ({ createItinerary }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

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
  createItinerary.mockResolvedValue({
    success: true,
    message: "Itinerary created",
    id: "trip-1",
  });
});

const openDialog = () =>
  userEvent.click(screen.getByRole("button", { name: "New trip" }));

describe("NewTripButton", () => {
  it("opens the New trip dialog", async () => {
    render(<NewTripButton />);
    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();

    await openDialog();

    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce();
    expect(screen.getByLabelText("Trip name")).toHaveValue("");
  });

  it("disables Create until the trip has a name", async () => {
    render(<NewTripButton />);
    await openDialog();
    const create = screen.getByRole("button", { name: "Create" });
    expect(create).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Trip name"), "   ");
    expect(create).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Trip name"), "Rome");
    expect(create).toBeEnabled();
  });

  it("creates the trip and opens its page", async () => {
    render(<NewTripButton />);
    await openDialog();
    await userEvent.type(screen.getByLabelText("Trip name"), "Weekend in Rome");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(createItinerary).toHaveBeenCalledWith("Weekend in Rome");
    expect(push).toHaveBeenCalledWith("/my-itineraries/trip-1");
    expect(screen.getByRole("button", { name: "Creating…" })).toBeDisabled();
  });

  it("shows the error and stays open when creating fails", async () => {
    createItinerary.mockResolvedValue({
      success: false,
      message: "Not authenticated",
    });
    render(<NewTripButton />);
    await openDialog();
    await userEvent.type(screen.getByLabelText("Trip name"), "Rome{enter}");

    expect(screen.getByRole("alert")).toHaveTextContent("Not authenticated");
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Create" })).toBeEnabled();
  });

  it("starts empty again after being cancelled", async () => {
    render(<NewTripButton />);
    await openDialog();
    await userEvent.type(screen.getByLabelText("Trip name"), "Rome");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();

    await openDialog();
    expect(screen.getByLabelText("Trip name")).toHaveValue("");
  });
});
