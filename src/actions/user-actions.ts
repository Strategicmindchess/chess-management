"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { hashPassword } from "@/lib/password";
import {
  createStaffUserSchema,
  type CreateStaffUserInput,
} from "@/lib/validation/user";
import type { ActionResult } from "@/lib/types";

/**
 * Admin-only: creates a Coach (TEACHER) or Student account.
 * Server Actions are reachable directly, so authorization is re-checked here
 * even though the UI only exposes this to Admins.
 */
export async function createStaffUser(
  input: CreateStaffUserInput,
): Promise<ActionResult> {
  await requireRole(["ADMIN"]);

  const parsed = createStaffUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const {
    name,
    email,
    phone,
    password,
    role,
    parentName,
    parentPhone,
    city,
    chessComId,
    lichessId,
    chessComRating,
    lichessRating,
  } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "A user with this email already exists." };
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      passwordHash,
      role,
      emailVerified: true,
      ...(role === "STUDENT"
        ? {
            studentProfile: {
              create: {
                parentName: parentName || null,
                parentPhone: parentPhone || null,
                city: city || null,
                chessComId: chessComId || null,
                lichessId: lichessId || null,
                chessComRating: isNaN(chessComRating as number) ? null : chessComRating,
                lichessRating: isNaN(lichessRating as number) ? null : lichessRating,
                joiningDate: new Date(),
              },
            },
          }
        : {}),
      ...(role === "TEACHER"
        ? {
            coachProfile: {
              create: {
                city: city || null,
                chessComId: chessComId || null,
                lichessId: lichessId || null,
                chessComRating: isNaN(chessComRating as number) ? null : chessComRating,
                lichessRating: isNaN(lichessRating as number) ? null : lichessRating,
              },
            },
          }
        : {}),
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/batches");
  return { success: true };
}

export async function setUserActiveState(
  userId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const currentUser = await requireRole(["ADMIN"]);

  if (currentUser.id === userId) {
    return { success: false, error: "You cannot deactivate your own account." };
  }

  await prisma.user.update({ where: { id: userId }, data: { isActive } });

  revalidatePath("/admin/users");
  revalidatePath("/admin/batches");
  return { success: true };
}
