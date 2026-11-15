"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { Role } from "@/lib/enums";
import {
  getStudentPassportData,
  StudentPassportData,
} from "@/services/passport/passport.service";
import { fetchChessComStats } from "@/services/chess/chesscom";
import { fetchLichessUser } from "@/services/chess/lichess";

export interface PassportPrivacyInput {
  isPublicPassportEnabled?: boolean;
  showRatings?: boolean;
  showAchievements?: boolean;
  showRatingProgress?: boolean;
  showTournaments?: boolean;
  showCertificates?: boolean;
  showFideRating?: boolean;
}

/**
 * Get current student's own passport.
 */
export async function getMyPassport(): Promise<{
  success: boolean;
  data?: StudentPassportData | null;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!studentProfile) {
      return { success: false, error: "Student profile not found" };
    }

    const data = await getStudentPassportData(studentProfile.id, {
      viewerRole: Role.STUDENT,
      viewerUserId: user.id,
    });

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load passport" };
  }
}

/**
 * Coach or Admin viewing a student's passport.
 */
export async function getStudentPassportForCoachOrAdmin(
  studentProfileId: string
): Promise<{
  success: boolean;
  data?: StudentPassportData | null;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Not authenticated" };

    if (user.role === Role.ADMIN) {
      const data = await getStudentPassportData(studentProfileId, {
        viewerRole: Role.ADMIN,
        viewerUserId: user.id,
      });
      return { success: true, data };
    }

    if (user.role === Role.TEACHER) {
      const coachProfile = await prisma.coachProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      if (!coachProfile) {
        return { success: false, error: "Coach profile not found" };
      }

      // Verify coach teaches this student or is assigned coach
      const isAssigned = await prisma.studentProfile.findFirst({
        where: {
          id: studentProfileId,
          OR: [
            { assignedCoachId: coachProfile.id },
            {
              enrollments: {
                some: {
                  batch: { coachProfileId: coachProfile.id },
                },
              },
            },
          ],
        },
        select: { id: true },
      });

      if (!isAssigned) {
        return {
          success: false,
          error: "Unauthorized: You can only view passports of your assigned students.",
        };
      }

      const data = await getStudentPassportData(studentProfileId, {
        viewerRole: Role.TEACHER,
        viewerUserId: user.id,
      });
      return { success: true, data };
    }

    return { success: false, error: "Unauthorized access" };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load passport" };
  }
}

/**
 * Update privacy preferences for student passport.
 */
export async function updatePassportPrivacy(
  input: PassportPrivacyInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!studentProfile) {
      return { success: false, error: "Student profile not found" };
    }

    await prisma.studentProfile.update({
      where: { id: studentProfile.id },
      data: {
        ...(input.isPublicPassportEnabled !== undefined && {
          isPublicPassportEnabled: input.isPublicPassportEnabled,
        }),
        ...(input.showRatings !== undefined && { showRatings: input.showRatings }),
        ...(input.showAchievements !== undefined && { showAchievements: input.showAchievements }),
        ...(input.showRatingProgress !== undefined && { showRatingProgress: input.showRatingProgress }),
        ...(input.showTournaments !== undefined && { showTournaments: input.showTournaments }),
        ...(input.showCertificates !== undefined && { showCertificates: input.showCertificates }),
        ...(input.showFideRating !== undefined && { showFideRating: input.showFideRating }),
      },
    });

    revalidatePath("/student/profile");
    revalidatePath(`/passport/${studentProfile.id}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update privacy settings" };
  }
}

/**
 * Update Student Bio & FIDE credentials.
 */
export async function updatePassportBio(data: {
  bio?: string;
  fideId?: string;
  fideRating?: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!studentProfile) {
      return { success: false, error: "Student profile not found" };
    }

    await prisma.studentProfile.update({
      where: { id: studentProfile.id },
      data: {
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.fideId !== undefined && { fideId: data.fideId || null }),
        ...(data.fideRating !== undefined && { fideRating: data.fideRating || null }),
      },
    });

    revalidatePath("/student/profile");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update profile info" };
  }
}

/**
 * Generate a new shareable link slug for the student passport.
 */
export async function regeneratePassportSlug(): Promise<{
  success: boolean;
  slug?: string;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, user: { select: { name: true } } },
    });

    if (!studentProfile) {
      return { success: false, error: "Student profile not found" };
    }

    const cleanName = (studentProfile.user.name || "chessmate")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 15);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newSlug = `${cleanName}-${randomSuffix}`;

    await prisma.studentProfile.update({
      where: { id: studentProfile.id },
      data: { shareSlug: newSlug },
    });

    revalidatePath("/student/profile");
    return { success: true, slug: newSlug };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to regenerate shareable link" };
  }
}

/**
 * Super Admin action: Issue a verified SMC certificate to a student.
 */
export async function issueStudentCertificate(data: {
  studentProfileId: string;
  title: string;
  description?: string;
  category?: "COURSE_COMPLETION" | "TOURNAMENT_WIN" | "TACTICAL_MASTERY" | "MERIT" | "SPECIAL_ACHIEVEMENT";
  certificateNumber?: string;
  certificateUrl?: string;
}): Promise<{ success: boolean; certificateId?: string; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== Role.ADMIN) {
      return { success: false, error: "Unauthorized. Admin role required." };
    }

    const certNum =
      data.certificateNumber ||
      `SMC-CERT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const cert = await prisma.studentCertificate.create({
      data: {
        studentProfileId: data.studentProfileId,
        title: data.title,
        description: data.description || null,
        category: data.category || "COURSE_COMPLETION",
        certificateNumber: certNum,
        certificateUrl: data.certificateUrl || null,
        issuedById: user.id,
      },
    });

    revalidatePath("/student/profile");
    revalidatePath(`/admin/students/${data.studentProfileId}/passport`);
    return { success: true, certificateId: cert.id };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to issue certificate" };
  }
}

/**
 * Super Admin action: Delete a certificate.
 */
export async function deleteStudentCertificate(
  certificateId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== Role.ADMIN) {
      return { success: false, error: "Unauthorized. Admin role required." };
    }

    await prisma.studentCertificate.delete({
      where: { id: certificateId },
    });

    revalidatePath("/student/profile");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete certificate" };
  }
}

/**
 * Instant refresh/sync of student chess stats from Chess.com and Lichess.
 */
export async function syncStudentPassportRatings(studentProfileId?: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Not authenticated" };

    let targetId = studentProfileId;
    if (!targetId) {
      const sp = await prisma.studentProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      targetId = sp?.id;
    }

    if (!targetId) {
      return { success: false, error: "Student profile not found" };
    }

    const student = await prisma.studentProfile.findUnique({
      where: { id: targetId },
      include: { chessAccount: true },
    });

    if (!student) return { success: false, error: "Student not found" };

    const ccUser = student.chessAccount?.chessComUsername || student.chessComId;
    const liUser = student.chessAccount?.lichessUsername || student.lichessId;

    let updatedCC = false;
    let updatedLI = false;

    // Fetch Chess.com live stats
    let ccRapid: number | null = null;
    let ccBlitz: number | null = null;
    let ccBullet: number | null = null;
    let ccPuzzle: number | null = null;

    if (ccUser) {
      const statsRes = await fetchChessComStats(ccUser);
      if (statsRes.ok && statsRes.data) {
        const d: any = statsRes.data;
        ccRapid = d.chess_rapid?.last?.rating || null;
        ccBlitz = d.chess_blitz?.last?.rating || null;
        ccBullet = d.chess_bullet?.last?.rating || null;
        ccPuzzle = d.tactics?.highest?.rating || d.tactics?.lowest?.rating || null;
        updatedCC = true;
      }
    }

    // Fetch Lichess live user perfs
    let liRapid: number | null = null;
    let liBlitz: number | null = null;
    let liBullet: number | null = null;
    let liPuzzle: number | null = null;

    if (liUser) {
      const liRes = await fetchLichessUser(liUser);
      if (liRes.ok && liRes.data) {
        const perfs = liRes.data.perfs;
        liRapid = perfs?.rapid?.rating || null;
        liBlitz = perfs?.blitz?.rating || null;
        liBullet = perfs?.bullet?.rating || null;
        liPuzzle = perfs?.puzzle?.rating || null;
        updatedLI = true;
      }
    }

    if (updatedCC || updatedLI) {
      // Upsert StudentChessStats
      await prisma.studentChessStats.upsert({
        where: { studentProfileId: targetId },
        create: {
          studentProfileId: targetId,
          ...(ccRapid && { ccRapidRating: ccRapid }),
          ...(ccBlitz && { ccBlitzRating: ccBlitz }),
          ...(ccBullet && { ccBulletRating: ccBullet }),
          ...(ccPuzzle && { ccPuzzleRating: ccPuzzle }),
          ...(liRapid && { liRapidRating: liRapid }),
          ...(liBlitz && { liBlitzRating: liBlitz }),
          ...(liBullet && { liBulletRating: liBullet }),
          ...(liPuzzle && { liPuzzleRating: liPuzzle }),
          lastSyncedAt: new Date(),
        },
        update: {
          ...(ccRapid && { ccRapidRating: ccRapid }),
          ...(ccBlitz && { ccBlitzRating: ccBlitz }),
          ...(ccBullet && { ccBulletRating: ccBullet }),
          ...(ccPuzzle && { ccPuzzleRating: ccPuzzle }),
          ...(liRapid && { liRapidRating: liRapid }),
          ...(liBlitz && { liBlitzRating: liBlitz }),
          ...(liBullet && { liBulletRating: liBullet }),
          ...(liPuzzle && { liPuzzleRating: liPuzzle }),
          lastSyncedAt: new Date(),
        },
      });

      // Also record historical snapshot point if high rating
      const peakCandidates = [
        ccRapid ? { rating: ccRapid, platform: "Chess.com", format: "Rapid" } : null,
        liRapid ? { rating: liRapid, platform: "Lichess", format: "Rapid" } : null,
        ccBlitz ? { rating: ccBlitz, platform: "Chess.com", format: "Blitz" } : null,
        liBlitz ? { rating: liBlitz, platform: "Lichess", format: "Blitz" } : null,
      ].filter(Boolean) as { rating: number; platform: string; format: string }[];

      if (peakCandidates.length > 0) {
        const highest = peakCandidates.sort((a, b) => b.rating - a.rating)[0];
        const currentPeak = student.peakRating || 0;
        if (highest.rating > currentPeak) {
          await prisma.studentProfile.update({
            where: { id: targetId },
            data: {
              peakRating: highest.rating,
              peakRatingPlatform: highest.platform,
              peakRatingFormat: highest.format,
              peakRatingDate: new Date(),
            },
          });
        }

        // Add history point
        await prisma.studentRatingHistory.create({
          data: {
            studentProfileId: targetId,
            platform: highest.platform,
            format: highest.format,
            rating: highest.rating,
            recordedAt: new Date(),
          },
        });
      }

      revalidatePath("/student/profile");
      revalidatePath(`/passport/${student.shareSlug || student.id}`);
      return { success: true, message: "Ratings updated successfully from live platforms." };
    }

    return { success: true, message: "No live ratings found or accounts not linked." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to sync ratings" };
  }
}
