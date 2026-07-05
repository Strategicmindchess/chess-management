import { z } from "zod";

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createStaffUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{7,15}$/, "Enter a valid phone number.")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter.")
    .regex(/[0-9]/, "Password must contain at least one number."),
  role: z.enum(["TEACHER", "STUDENT"], "Select a role."),
  // --- Module 7 Student Fields ---
  parentName: z.string().trim().optional().or(z.literal("")),
  parentPhone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{7,15}$/, "Enter a valid phone number.")
    .optional()
    .or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  chessComId: z.string().trim().optional().or(z.literal("")),
  lichessId: z.string().trim().optional().or(z.literal("")),
  rating: z.coerce.number().min(0).max(4000).optional(),
  monthlyFee: z.coerce.number().min(0).optional(),
  perSessionFee: z.coerce.number().min(0).optional(),
});

export type CreateStaffUserInput = z.infer<typeof createStaffUserSchema>;

export const timeRegex = TIME_REGEX;
