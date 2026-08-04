"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { Role, StudentLevel } from "@/generated/prisma/client";

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
  fideId: z.string().optional().or(z.literal("")),
  fideRating: z.string().optional().transform(v => v ? parseInt(v, 10) : null),
  level: z.nativeEnum(StudentLevel).optional().or(z.literal("")),
  // Coach fields
  bio: z.string().optional().or(z.literal("")),
  experience: z.string().optional().or(z.literal("")),
});

export async function updateProfile(formData: FormData) {
  const user = await getCurrentUser();
  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") ?? undefined,
    parentName: formData.get("parentName") ?? undefined,
    parentPhone: formData.get("parentPhone") ?? undefined,
    city: formData.get("city") ?? undefined,
    chessComId: formData.get("chessComId") ?? undefined,
    lichessId: formData.get("lichessId") ?? undefined,
    chessComRating: formData.get("chessComRating") ?? undefined,
    lichessRating: formData.get("lichessRating") ?? undefined,
    fideId: formData.get("fideId") ?? undefined,
    fideRating: formData.get("fideRating") ?? undefined,
    level: formData.get("level") || undefined, // handle empty string gracefully
    bio: formData.get("bio") ?? undefined,
    experience: formData.get("experience") ?? undefined,
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
    if (user.role === Role.STUDENT) {
      const studentData = {
        parentName: data.parentName || null,
        parentPhone: data.parentPhone || null,
        city: data.city || null,
        chessComId: data.chessComId || null,
        lichessId: data.lichessId || null,
        chessComRating: data.chessComRating,
        lichessRating: data.lichessRating,
        fideId: data.fideId || null,
        fideRating: data.fideRating,
        level: data.level ? (data.level as StudentLevel) : null,
      };

      await prisma.studentProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          ...studentData,
        },
        update: studentData,
      });
    } else if (user.role === Role.TEACHER) {
      const coachData = {
        bio: data.bio || null,
        experience: data.experience || null,
        city: data.city || null,
      };

      await prisma.coachProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          ...coachData,
        },
        update: coachData,
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
