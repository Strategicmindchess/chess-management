"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  userId: z.string(),
  role: z.nativeEnum(Role),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  city: z.string().optional(),
  isActive: z.string().optional().transform(v => v === "true"),
  rating: z.string().optional().transform(v => v ? parseInt(v, 10) : null),
  monthlyFee: z.string().optional().transform(v => v ? parseInt(v, 10) : null),
  perSessionFee: z.string().optional().transform(v => v ? parseInt(v, 10) : null),
  groupSessionRate: z.string().optional().transform(v => v ? parseInt(v, 10) : null),
  privateRate: z.string().optional().transform(v => v ? parseInt(v, 10) : null),
  bio: z.string().optional(),
  experience: z.string().optional(),
});

export async function updateAdminUserFields(formData: FormData) {
  try {
    await requireRole([Role.ADMIN]);

    const parsed = updateSchema.safeParse({
      userId: formData.get("userId"),
      role: formData.get("role"),
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      city: formData.get("city"),
      isActive: formData.get("isActive"),
      rating: formData.get("rating"),
      monthlyFee: formData.get("monthlyFee"),
      perSessionFee: formData.get("perSessionFee"),
      groupSessionRate: formData.get("groupSessionRate"),
      privateRate: formData.get("privateRate"),
      bio: formData.get("bio"),
      experience: formData.get("experience"),
    });

    if (!parsed.success) {
      return { error: "Invalid form data" };
    }

    const data = parsed.data;

    // Update base user
    await prisma.user.update({
      where: { id: data.userId },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        isActive: data.isActive,
      }
    });

    if (data.role === Role.STUDENT) {
      await prisma.studentProfile.update({
        where: { userId: data.userId },
        data: {
          city: data.city || null,
          rating: data.rating,
          monthlyFee: data.monthlyFee,
          perSessionFee: data.perSessionFee,
        },
      });
    } else if (data.role === Role.TEACHER) {
      const coachProfile = await prisma.coachProfile.findUnique({
        where: { userId: data.userId }
      });
      
      if (coachProfile) {
        await prisma.coachProfile.update({
          where: { id: coachProfile.id },
          data: {
            city: data.city || null,
            bio: data.bio || null,
            experience: data.experience || null,
          }
        });

        await prisma.coachRate.upsert({
          where: { coachId: coachProfile.id },
          create: {
            coachId: coachProfile.id,
            groupSessionRate: data.groupSessionRate ?? 0,
            privateRate: data.privateRate ?? 0,
          },
          update: {
            groupSessionRate: data.groupSessionRate ?? 0,
            privateRate: data.privateRate ?? 0,
          }
        });
      }
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Failed to update user:", error);
    return { error: "Failed to update user. Please try again." };
  }
}
