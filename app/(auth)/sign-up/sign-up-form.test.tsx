vi.mock("next/navigation", () => ({ useRouter: vi.fn() }));
vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));
vi.mock("@/app/actions/user-actions", () => ({
  signUpUser: vi.fn(),
}));
// Mock useActionState so tests can control the returned state directly.
// React 19 form actions run inside startTransition which never settles in
// jsdom, so state updates from form submissions would not reach the component.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, useActionState: vi.fn() };
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signIn } from "next-auth/react";
import { useActionState } from "react";
import SignUpForm from "./sign-up-form";

const mockSignIn = signIn as ReturnType<typeof vi.fn>;
const mockUseActionState = useActionState as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockSignIn.mockResolvedValue(undefined);
  // Default: initial state — no error, no pending
  mockUseActionState.mockReturnValue([
    { success: false, message: "" },
    vi.fn(),
    false,
  ]);
});

describe("SignUpForm", () => {
  // ── Rendering ──────────────────────────────────────────────────────────

  it("renders the name, email, password, and confirm password fields", () => {
    render(<SignUpForm />);
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it("renders the Sign Up submit button", () => {
    render(<SignUpForm />);
    expect(
      screen.getByRole("button", { name: /sign up/i }),
    ).toBeInTheDocument();
  });

  it("renders the Continue with Google button", () => {
    render(<SignUpForm />);
    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeInTheDocument();
  });

  it("renders a link to the sign-in page", () => {
    render(<SignUpForm />);
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      "/sign-in",
    );
  });

  // ── Interactions ───────────────────────────────────────────────────────

  it("updates the name field when the user types", async () => {
    render(<SignUpForm />);
    const nameInput = screen.getByLabelText(/^name$/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Alice");
    expect(nameInput).toHaveValue("Alice");
  });

  it("updates the email field when the user types", async () => {
    render(<SignUpForm />);
    const emailInput = screen.getByLabelText(/^email$/i);
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, "alice@example.com");
    expect(emailInput).toHaveValue("alice@example.com");
  });

  it("updates the password field when the user types", async () => {
    render(<SignUpForm />);
    const passwordInput = screen.getByLabelText(/^password$/i);
    await userEvent.clear(passwordInput);
    await userEvent.type(passwordInput, "secret123");
    expect(passwordInput).toHaveValue("secret123");
  });

  it("updates the confirm password field when the user types", async () => {
    render(<SignUpForm />);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    await userEvent.clear(confirmInput);
    await userEvent.type(confirmInput, "secret123");
    expect(confirmInput).toHaveValue("secret123");
  });

  // ── Error message display ──────────────────────────────────────────────

  it("shows the error message returned by the server action", () => {
    mockUseActionState.mockReturnValue([
      { success: false, message: "Email already in use" },
      vi.fn(),
      false,
    ]);

    render(<SignUpForm />);

    expect(screen.getByText("Email already in use")).toBeInTheDocument();
  });

  it("does not show an error message when there is no error", () => {
    mockUseActionState.mockReturnValue([
      { success: true, message: "" },
      vi.fn(),
      false,
    ]);

    render(<SignUpForm />);

    expect(screen.queryByText(/email already in use/i)).not.toBeInTheDocument();
  });

  // ── Google sign-up ─────────────────────────────────────────────────────

  it("calls next-auth signIn with 'google' when the Google button is clicked", async () => {
    render(<SignUpForm />);
    await userEvent.click(
      screen.getByRole("button", { name: /continue with google/i }),
    );

    expect(mockSignIn).toHaveBeenCalledWith("google", { callbackUrl: "/" });
  });
});
