vi.mock("next/navigation", () => ({ useRouter: vi.fn() }));
vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));
vi.mock("@/app/actions/user-actions", () => ({
  signInWithCredentials: vi.fn(),
}));
// Mock useActionState so tests can control the returned state directly.

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, useActionState: vi.fn() };
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signIn } from "next-auth/react";
import { useActionState } from "react";
import SignInForm from "./sign-in-form";

const mockSignIn = signIn as ReturnType<typeof vi.fn>;
const mockUseActionState = useActionState as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockSignIn.mockResolvedValue(undefined);
  // Default: no error state, dispatch is a no-op stub
  mockUseActionState.mockReturnValue([
    { success: false, message: "" },
    vi.fn(),
    false,
  ]);
});

describe("SignInForm", () => {
  // ── Rendering ──────────────────────────────────────────────────────────

  it("renders the email and password fields", () => {
    render(<SignInForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("renders the Sign In submit button", () => {
    render(<SignInForm />);
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it("renders the Continue with Google button", () => {
    render(<SignInForm />);
    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeInTheDocument();
  });

  it("renders a link to the sign-up page", () => {
    render(<SignInForm />);
    expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute(
      "href",
      "/sign-up",
    );
  });

  // ── Interactions ───────────────────────────────────────────────────────

  it("updates the email field when the user types", async () => {
    render(<SignInForm />);
    const emailInput = screen.getByLabelText(/email/i);
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, "user@example.com");
    expect(emailInput).toHaveValue("user@example.com");
  });

  it("updates the password field when the user types", async () => {
    render(<SignInForm />);
    const passwordInput = screen.getByLabelText(/password/i);
    await userEvent.clear(passwordInput);
    await userEvent.type(passwordInput, "secret123");
    expect(passwordInput).toHaveValue("secret123");
  });

  // ── Error message display ──────────────────────────────────────────────

  it("shows the error message returned by the server action", () => {
    mockUseActionState.mockReturnValue([
      { success: false, message: "Invalid email or password" },
      vi.fn(),
      false,
    ]);

    render(<SignInForm />);

    expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
  });

  it("does not show an error message when there is no error", () => {
    mockUseActionState.mockReturnValue([
      { success: true, message: "" },
      vi.fn(),
      false,
    ]);

    render(<SignInForm />);

    expect(
      screen.queryByText(/invalid email or password/i),
    ).not.toBeInTheDocument();
  });

  // ── Google sign-in ─────────────────────────────────────────────────────

  it("calls next-auth signIn with 'google' when the Google button is clicked", async () => {
    render(<SignInForm />);
    await userEvent.click(
      screen.getByRole("button", { name: /continue with google/i }),
    );

    expect(mockSignIn).toHaveBeenCalledWith("google", { callbackUrl: "/" });
  });
});
