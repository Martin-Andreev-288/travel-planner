import {
  itineraryActivitySchema,
  itineraryTitleSchema,
  signInFormSchema,
  signUpFormSchema,
} from "./validations";

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

// ── itineraryTitleSchema ────────────────────────────────────────────────────

describe("itineraryTitleSchema", () => {
  it("accepts a name and trims it", () => {
    const result = itineraryTitleSchema.safeParse("  Summer in Rome  ");
    expect(result.success && result.data).toBe("Summer in Rome");
  });

  it("rejects an empty or blank name", () => {
    const result = itineraryTitleSchema.safeParse("   ");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Trip name is required");
    }
  });

  it("rejects a name longer than 100 characters", () => {
    expect(itineraryTitleSchema.safeParse("x".repeat(101)).success).toBe(false);
  });
});

// ── itineraryActivitySchema ─────────────────────────────────────────────────

describe("itineraryActivitySchema", () => {
  const valid = {
    name: "Museum Island",
    city: "Berlin",
    date: "2027-02-01",
    startTime: "09:00",
    endTime: "11:30",
  };
  const firstMessage = (input: object) => {
    const result = itineraryActivitySchema.safeParse(input);
    return result.success ? null : result.error.issues[0].message;
  };

  it("accepts a complete activity", () => {
    expect(itineraryActivitySchema.safeParse(valid).success).toBe(true);
  });

  it("accepts an activity with only a name and a city", () => {
    const result = itineraryActivitySchema.safeParse({
      name: "Museum Island",
      city: "Berlin",
    });
    expect(result.success).toBe(true);
  });

  it("trims the name and the city", () => {
    const result = itineraryActivitySchema.safeParse({
      ...valid,
      name: "  Museum Island ",
      city: " Berlin ",
    });
    expect(result.success && result.data).toMatchObject({
      name: "Museum Island",
      city: "Berlin",
    });
  });

  it("requires a name and a city", () => {
    expect(firstMessage({ ...valid, name: " " })).toBe(
      "Activity name is required",
    );
    expect(firstMessage({ ...valid, city: "" })).toBe("City is required");
  });

  it("rejects dates in other formats", () => {
    expect(firstMessage({ ...valid, date: "01.02.2027" })).toBe(
      "Date must be in YYYY-MM-DD format",
    );
  });

  it("rejects dates that don't exist", () => {
    expect(firstMessage({ ...valid, date: "2027-02-30" })).toBe(
      "Date is not a valid calendar date",
    );
  });

  it("rejects times that aren't 24-hour HH:MM", () => {
    expect(firstMessage({ ...valid, startTime: "9:00" })).toBe(
      "Start time must be in HH:MM format",
    );
    expect(firstMessage({ ...valid, endTime: "24:00" })).toBe(
      "End time must be in HH:MM format",
    );
  });

  it("requires a start time when an end time is given", () => {
    expect(firstMessage({ ...valid, startTime: undefined })).toBe(
      "Add a start time before the end time",
    );
  });

  it("requires the end time to be after the start time", () => {
    expect(firstMessage({ ...valid, endTime: "09:00" })).toBe(
      "End time must be after the start time",
    );
    expect(firstMessage({ ...valid, endTime: "08:00" })).toBe(
      "End time must be after the start time",
    );
  });

  it("allows a start time without an end time", () => {
    const result = itineraryActivitySchema.safeParse({
      ...valid,
      endTime: undefined,
    });
    expect(result.success).toBe(true);
  });
});
