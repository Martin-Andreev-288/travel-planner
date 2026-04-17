import { formatError } from "./utils";

describe("formatError", () => {
  // ── ZodError branch ───────────────────────────────────────────────────────

  it("formats a ZodError with a single field error", () => {
    const error = {
      name: "ZodError",
      errors: {
        email: { message: "Invalid email address" },
      },
    };
    expect(formatError(error)).toBe("Invalid email address");
  });

  it("joins multiple ZodError field messages with a period", () => {
    const error = {
      name: "ZodError",
      errors: {
        name: { message: "Name is required" },
        email: { message: "Invalid email address" },
      },
    };
    expect(formatError(error)).toBe("Name is required. Invalid email address");
  });

  // ── Prisma P2002 branch ───────────────────────────────────────────────────

  it("formats a Prisma P2002 error with a target field", () => {
    const error = {
      name: "PrismaClientKnownRequestError",
      code: "P2002",
      meta: { target: ["email"] },
    };
    expect(formatError(error)).toBe("Email already exists");
  });

  it("capitalizes the first letter of the target field", () => {
    const error = {
      name: "PrismaClientKnownRequestError",
      code: "P2002",
      meta: { target: ["username"] },
    };
    expect(formatError(error)).toBe("Username already exists");
  });

  it('falls back to "Field" when meta.target is missing', () => {
    const error = {
      name: "PrismaClientKnownRequestError",
      code: "P2002",
      meta: {},
    };
    expect(formatError(error)).toBe("Field already exists");
  });

  it('falls back to "Field" when meta is undefined', () => {
    const error = {
      name: "PrismaClientKnownRequestError",
      code: "P2002",
    };
    expect(formatError(error)).toBe("Field already exists");
  });

  // ── Generic error branch ──────────────────────────────────────────────────

  it("returns the message string for a standard Error", () => {
    const error = new Error("Something went wrong");
    expect(formatError(error)).toBe("Something went wrong");
  });

  it("JSON-stringifies a non-string message", () => {
    const error = {
      name: "CustomError",
      message: { detail: "unexpected" },
    };
    expect(formatError(error)).toBe('{"detail":"unexpected"}');
  });
});
