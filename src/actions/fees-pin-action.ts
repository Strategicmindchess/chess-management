"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "fees_pin_ok";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

/**
 * Server action: validates the submitted PIN against the FEES_PAGE_PIN env var.
 * On success → sets an httpOnly cookie and redirects back to /admin/fees.
 * On failure → returns an error message.
 */
export async function verifyFeesPin(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const submitted = (formData.get("pin") as string | null)?.trim() ?? "";
  const expected = process.env.FEES_PAGE_PIN ?? "";

  if (!expected) {
    // No PIN configured → deny access entirely
    return { error: "Fees page PIN is not configured. Contact the admin." };
  }

  if (submitted !== expected) {
    return { error: "Incorrect PIN. Please try again." };
  }

  // Set a server-side httpOnly cookie valid for 8 hours
  const jar = await cookies();
  jar.set(COOKIE_NAME, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/admin/fees",
  });

  redirect("/admin/fees");
}

/** Check from a Server Component whether the PIN cookie is present. */
export async function isFeesUnlocked(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value === "1";
}
