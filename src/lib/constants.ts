import { Role, Weekday } from "@/lib/enums";

export const ROLE_HOME_PATH: Record<Role, string> = {
  ADMIN: "/admin",
  TEACHER: "/teacher",
  STUDENT: "/student",
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  TEACHER: "Coach",
  STUDENT: "Student",
};

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

export const WEEKDAY_OPTIONS: { value: Weekday; label: string }[] = (
  Object.keys(WEEKDAY_LABEL) as Weekday[]
).map((value) => ({ value, label: WEEKDAY_LABEL[value] }));

// --- Auth cookies & token lifetimes -------------------------------------
export const ACCESS_TOKEN_COOKIE = "smc_access_token";
export const REFRESH_TOKEN_COOKIE = "smc_refresh_token";
export const OAUTH_STATE_COOKIE = "smc_oauth_state";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// --- OTP (email verification / password reset) --------------------------
export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute
