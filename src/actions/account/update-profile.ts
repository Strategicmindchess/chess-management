"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { Role } from "@/lib/enums";

const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  phone: z.string().optional().or(z.literal("")),
  // Student fields
  parentName: z.string().optional().or(z.literal("")),
  parentPhone: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  chessComId: z.string().optional().or(z.literal("")),
  lichessId: z.string().optional().or(z.literal("")),
  chessComRating: z.string().optional().transform(v => v ? parseInt(v, 10) : null),
  lichessRating: z.string().optional().transform(v => v ? parseInt(v, 10) : null),
  // Coach fields
  bio: z.string().optional().or(z.literal("")),
  experience: z.string().optional().or(z.literal("")),
});

export async function updateProfile(formData: FormData) {
  const user = await getCurrentUser();
  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    parentName: formData.get("parentName"),
    parentPhone: formData.get("parentPhone"),
    city: formData.get("city"),
    chessComId: formData.get("chessComId"),
    lichessId: formData.get("lichessId"),
    chessComRating: formData.get("chessComRating"),
    lichessRating: formData.get("lichessRating"),
    bio: formData.get("bio"),
    experience: formData.get("experience"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  try {
    // Update base user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: data.name,
        phone: data.phone || null,
      },
    });

    // Update specific profiles if applicable
    if (user.role === Role.STUDENT && user.studentProfile) {
      await prisma.studentProfile.update({
        where: { id: user.studentProfile.id },
        data: {
          parentName: data.parentName || null,
          parentPhone: data.parentPhone || null,
          city: data.city || null,
          chessComId: data.chessComId || null,
          lichessId: data.lichessId || null,
          chessComRating: data.chessComRating,
          lichessRating: data.lichessRating,
        },
      });
    } else if (user.role === Role.TEACHER && user.coachProfile) {
      await prisma.coachProfile.update({
        where: { id: user.coachProfile.id },
        data: {
          bio: data.bio || null,
          experience: data.experience || null,
          city: data.city || null,
        },
      });
    }
    
    // Revalidate everything that might display the user's name
    revalidatePath("/", "layout");
    
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Failed to update profile. Please try again later." };
  }
}
