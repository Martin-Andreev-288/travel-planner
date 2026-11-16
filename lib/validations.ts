import { z } from "zod";

// Schema for user sign-up
export const signUpFormSchema = z
  .object({
    name: z
      .string()
      .min(3, "Name must be at least 3 characters")
      .max(50, "Name must be less than 50 characters")
      .trim(),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(100, "Password must be less than 100 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Schema for user sign-in
export const signInFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Name of an itinerary created by hand
export const itineraryTitleSchema = z
  .string()
  .trim()
  .min(1, "Trip name is required")
  .max(100, "Trip name must be at most 100 characters");

const isRealDate = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

// Activity added to an itinerary by hand. Dates and times use the same
// formats the AI writes (YYYY-MM-DD, 24-hour HH:MM), so both kinds of items
// are shown, sorted and mapped the same way.
export const itineraryActivitySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Activity name is required")
      .max(100, "Activity name must be at most 100 characters"),
    city: z
      .string()
      .trim()
      .min(1, "City is required")
      .max(100, "City must be at most 100 characters"),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .refine(isRealDate, "Date is not a valid calendar date")
      .optional(),
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Start time must be in HH:MM format")
      .optional(),
    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "End time must be in HH:MM format")
      .optional(),
  })
  .refine((data) => !data.endTime || data.startTime, {
    message: "Add a start time before the end time",
    path: ["startTime"],
  })
  .refine(
    (data) => !data.startTime || !data.endTime || data.endTime > data.startTime,
    { message: "End time must be after the start time", path: ["endTime"] },
  );

export type SignUpFormInput = z.infer<typeof signUpFormSchema>;
export type SignInFormInput = z.infer<typeof signInFormSchema>;
export type ItineraryActivityInput = z.input<typeof itineraryActivitySchema>;
export type ItineraryActivity = z.output<typeof itineraryActivitySchema>;
