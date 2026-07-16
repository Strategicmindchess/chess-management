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
  chessComRating: z.string().optional().transform(v => v ? parseInt(v, 10) : null),
  lichessRating: z.string().optional().transform(v => v ? parseInt(v, 10) : null),
  bio: z.string().optional(),
  experience: z.string().optional(),
});

export async function updateAdminUserFields(formData: FormData) {
  try {
    await requireRole([Role.ADMIN]);
    console.log(formData);
 
    const parsed = updateSchema.safeParse({
      userId: formData.get("userId"),
      role: formData.get("role"),
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      city: formData.get("city"),
      isActive: formData.get("isActive"),
      chessComRating: formData.get("chessComRating") ?? undefined,
      lichessRating: formData.get("lichessRating") ?? undefined,
      bio: formData.get("bio"),
      experience: formData.get("experience"),
    });
     console.log(parsed);
  if (!parsed.success) {
  console.log(parsed.error.flatten());
  return {
    error: parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", "),
  };
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
          chessComRating: data.chessComRating,
          lichessRating: data.lichessRating,
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
            chessComRating: data.chessComRating,
            lichessRating: data.lichessRating,
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
