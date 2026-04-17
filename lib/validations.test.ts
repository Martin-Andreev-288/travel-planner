import { signUpFormSchema, signInFormSchema } from "./validations";

// ── signUpFormSchema ─────────────────────────────────────────────────────────

describe("signUpFormSchema", () => {
  const validInput = {
    name: "John Doe",
    email: "john@example.com",
    password: "secret123",
    confirmPassword: "secret123",
  };

  it("accepts valid input", () => {
    const result = signUpFormSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  // ── name ────────────────────────────────────────────────────────────────────

  it("rejects name shorter than 3 characters", () => {
    const result = signUpFormSchema.safeParse({ ...validInput, name: "AB" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Name must be at least 3 characters",
      );
    }
  });

  it("rejects name longer than 50 characters", () => {
    const result = signUpFormSchema.safeParse({
      ...validInput,
      name: "A".repeat(51),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Name must be less than 50 characters",
      );
    }
  });

  it("trims whitespace from name", () => {
    const result = signUpFormSchema.safeParse({
      ...validInput,
      name: "  John Doe  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("John Doe");
    }
  });

  // ── email ───────────────────────────────────────────────────────────────────

  it("rejects invalid email", () => {
    const result = signUpFormSchema.safeParse({
      ...validInput,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Invalid email address");
    }
  });

  // ── password ────────────────────────────────────────────────────────────────

  it("rejects password shorter than 6 characters", () => {
    const result = signUpFormSchema.safeParse({
      ...validInput,
      password: "12345",
      confirmPassword: "12345",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Password must be at least 6 characters",
      );
    }
  });

  it("rejects password longer than 100 characters", () => {
    const longPw = "a".repeat(101);
    const result = signUpFormSchema.safeParse({
      ...validInput,
      password: longPw,
      confirmPassword: longPw,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Password must be less than 100 characters",
      );
    }
  });

  // ── confirmPassword ─────────────────────────────────────────────────────────

  it("rejects empty confirmPassword", () => {
    const result = signUpFormSchema.safeParse({
      ...validInput,
      confirmPassword: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("Please confirm your password");
    }
  });

  it("rejects mismatched passwords", () => {
    const result = signUpFormSchema.safeParse({
      ...validInput,
      confirmPassword: "different",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("Passwords do not match");
    }
  });
});

// ── signInFormSchema ─────────────────────────────────────────────────────────

describe("signInFormSchema", () => {
  const validInput = {
    email: "john@example.com",
    password: "secret123",
  };

  it("accepts valid input", () => {
    const result = signInFormSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = signInFormSchema.safeParse({
      ...validInput,
      email: "bad",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Invalid email address");
    }
  });

  it("rejects empty password", () => {
    const result = signInFormSchema.safeParse({
      ...validInput,
      password: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Password is required");
    }
  });
});
