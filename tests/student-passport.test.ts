import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const { mockPrisma, mockCurrentUser } = vi.hoisted(() => ({
  mockCurrentUser: vi.fn(),
  mockPrisma: {
    studentProfile: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    studentCertificate: {
      create: vi.fn(),
      delete: vi.fn(),
    },
    studentBadge: {
      create: vi.fn(),
    },
    studentChessStats: {
      upsert: vi.fn(),
    },
    studentRatingHistory: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/dal", () => ({
  getCurrentUser: () => mockCurrentUser(),
  requireRole: () => mockCurrentUser(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import {
  getStudentPassportData,
  getPublicPassportBySlugOrId,
} from "@/services/passport/passport.service";
import {
  updatePassportPrivacy,
  issueStudentCertificate,
  deleteStudentCertificate,
} from "@/actions/passport/passport-actions";
import { Role } from "@/lib/enums";

describe("SMC Student Passport & Profile Enhancements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockFullStudent = {
    id: "sp-1",
    userId: "u-1",
    studentCode: "SMC-STU-0042",
    shareSlug: "arjun-sharma-2026",
    level: "INTERMEDIATE_1",
    bio: "Aspiring FIDE Candidate Master | King's Indian defense player",
    joiningDate: new Date("2026-01-15"),
    chessComId: "arjun_chess",
    lichessId: "arjun_li",
    fideId: "50192841",
    fideRating: 1410,
    peakRating: 1540,
    peakRatingPlatform: "Chess.com",
    peakRatingFormat: "Rapid",
    peakRatingDate: new Date("2026-08-10"),
    isPublicPassportEnabled: true,
    showRatings: true,
    showAchievements: true,
    showRatingProgress: true,
    showTournaments: true,
    showCertificates: true,
    showFideRating: true,
    updatedAt: new Date("2026-10-01"),
    user: {
      id: "u-1",
      name: "Arjun Sharma",
      profilePictureUrl: "https://example.com/avatar.jpg",
      isActive: true,
      createdAt: new Date("2026-01-15"),
    },
    assignedCoach: {
      id: "cp-1",
      city: "Jhansi",
      user: { id: "u-coach", name: "Grandmaster Coach" },
    },
    enrollments: [
      {
        batch: {
          id: "batch-1",
          name: "Intermediate Tactics A",
          code: "ITA-2026",
          isActive: true,
        },
      },
    ],
    chessAccount: {
      chessComUsername: "arjun_chess",
      chessComVerified: true,
      lichessUsername: "arjun_li",
      lichessVerified: true,
    },
    stats: {
      ccRapidRating: 1520,
      ccBlitzRating: 1430,
      ccBulletRating: 1350,
      ccPuzzleRating: 1820,
      ccTotalRapid: 65,
      ccTotalBlitz: 42,
      ccTotalBullet: 15,
      ccStreak: 16,
      liRapidRating: 1540,
      liBlitzRating: 1410,
      liBulletRating: 1300,
      liPuzzleRating: 1790,
      liStreak: 12,
      lastSyncedAt: new Date("2026-11-01"),
    },
    activitySnapshots: [
      {
        periodStart: new Date("2026-10-01"),
        periodEnd: new Date("2026-10-31"),
        streakDays: 16,
        puzzleAttempts: 120,
        puzzleSolved: 105,
        rapidRatingEnd: 1540,
      },
    ],
    certificates: [
      {
        id: "cert-1",
        certificateNumber: "SMC-CERT-2026-0091",
        title: "Intermediate Tactics Mastery",
        description: "Awarded for exceptional tactical puzzle completion and rating milestone.",
        category: "COURSE_COMPLETION",
        issueDate: new Date("2026-09-15"),
        certificateUrl: "https://example.com/cert-1.pdf",
        issuedBy: { name: "Head Coach SMC" },
      },
    ],
    customBadges: [],
    ratingHistories: [
      {
        recordedAt: new Date("2026-08-01"),
        platform: "Chess.com",
        format: "Rapid",
        rating: 1420,
      },
      {
        recordedAt: new Date("2026-10-01"),
        platform: "Chess.com",
        format: "Rapid",
        rating: 1520,
      },
    ],
    tournamentScores: [
      {
        id: "ts-1",
        tournamentDate: new Date("2026-10-14"),
        score: 88,
        participation: 10,
        performance: 9,
        sportsmanship: 10,
        notes: "Excellent piece coordination and tactical calculation under time pressure.",
        coach: { user: { name: "Head Coach SMC" } },
      },
    ],
    leaderboardEntries: [
      {
        periodType: "MONTHLY",
        periodStart: new Date("2026-10-01"),
        rank: 2,
        totalScore: 840,
      },
    ],
    leaderboardRewards: [
      {
        periodType: "MONTHLY",
        periodStart: new Date("2026-10-01"),
        rewardTitle: "1 Month Chess.com Gold Membership",
      },
    ],
    chocolateEligibility: [
      {
        isEligible: true,
      },
    ],
    puzzleSolverAwards: [],
  };

  it("1. getStudentPassportData — returns full digital chess passport for student view", async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue(mockFullStudent);

    const passport = await getStudentPassportData("sp-1", {
      viewerRole: Role.STUDENT,
      viewerUserId: "u-1",
    });

    expect(passport).not.toBeNull();
    expect(passport?.name).toBe("Arjun Sharma");
    expect(passport?.studentCode).toBe("SMC-STU-0042");
    expect(passport?.batch?.name).toBe("Intermediate Tactics A");
    expect(passport?.coach?.name).toBe("Grandmaster Coach");
    expect(passport?.peakRating.rating).toBe(1540);
    expect(passport?.isOwnProfile).toBe(true);

    // Online & FIDE ratings
    expect(passport?.ratings.length).toBeGreaterThanOrEqual(4);
    const fideCard = passport?.ratings.find((r) => r.platform === "FIDE");
    expect(fideCard).toBeDefined();
    expect(fideCard?.rating).toBe(1410);

    // Dynamic badges: 7-day, 14-day streak, 100+ puzzles, Chocolate club, Tournament fighter, Podium finisher, 1500+ Club
    const badgeKeys = passport?.badges.map((b) => b.badgeKey);
    expect(badgeKeys).toContain("STREAK_7");
    expect(badgeKeys).toContain("STREAK_14");
    expect(badgeKeys).toContain("PUZZLE_100");
    expect(badgeKeys).toContain("CHOCOLATE_CHAMPION");
    expect(badgeKeys).toContain("TOURNAMENT_WARRIOR");
    expect(badgeKeys).toContain("LEADERBOARD_PODIUM");
    expect(badgeKeys).toContain("RATING_1500");

    // Certificates
    expect(passport?.certificates.length).toBe(1);
    expect(passport?.certificates[0].certificateNumber).toBe("SMC-CERT-2026-0091");

    // Tournaments
    expect(passport?.tournaments.length).toBe(1);
    expect(passport?.tournaments[0].score).toBe(88);

    // Leaderboard
    expect(passport?.leaderboardHighlights.length).toBe(1);
    expect(passport?.leaderboardHighlights[0].rank).toBe(2);
    expect(passport?.leaderboardHighlights[0].rewards).toContain(
      "1 Month Chess.com Gold Membership"
    );
  });

  it("2. Privacy Enforcement — when public sharing is disabled, returns isPrivate=true and masks all data", async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({
      ...mockFullStudent,
      isPublicPassportEnabled: false,
    });

    const passport = await getStudentPassportData("sp-1", {
      viewerRole: "PUBLIC",
      viewerUserId: undefined,
    });

    expect(passport).not.toBeNull();
    expect(passport?.isPrivate).toBe(true);
    expect(passport?.ratings).toHaveLength(0);
    expect(passport?.badges).toHaveLength(0);
    expect(passport?.certificates).toHaveLength(0);
    expect(passport?.tournaments).toHaveLength(0);
    expect(passport?.chessAccounts.chessComUsername).toBeNull();
    expect(passport?.bio).toBeNull();
  });

  it("3. Granular Privacy Toggles — hides ratings and achievements if toggled off by student", async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({
      ...mockFullStudent,
      isPublicPassportEnabled: true,
      showRatings: false,
      showAchievements: false,
      showTournaments: false,
      showCertificates: false,
      showFideRating: false,
    });

    const passport = await getStudentPassportData("sp-1", {
      viewerRole: "PUBLIC",
    });

    expect(passport).not.toBeNull();
    expect(passport?.isPrivate).toBe(false);
    expect(passport?.ratings).toHaveLength(0);
    expect(passport?.badges).toHaveLength(0);
    expect(passport?.certificates).toHaveLength(0);
    expect(passport?.tournaments).toHaveLength(0);
    expect(passport?.chessAccounts.chessComUsername).toBeNull();
  });

  it("4. Public Passport Lookup — resolves by slug or code", async () => {
    mockPrisma.studentProfile.findFirst.mockResolvedValue({ id: "sp-1" });
    mockPrisma.studentProfile.findUnique.mockResolvedValue(mockFullStudent);

    const passport = await getPublicPassportBySlugOrId("arjun-sharma-2026");

    expect(passport).not.toBeNull();
    expect(passport?.name).toBe("Arjun Sharma");
  });

  it("5. updatePassportPrivacy — saves student preference toggles", async () => {
    mockCurrentUser.mockResolvedValue({ id: "u-1", role: Role.STUDENT });
    mockPrisma.studentProfile.findUnique.mockResolvedValue({ id: "sp-1" });
    mockPrisma.studentProfile.update.mockResolvedValue({ id: "sp-1" });

    const res = await updatePassportPrivacy({
      isPublicPassportEnabled: false,
      showRatings: true,
      showAchievements: true,
    });

    expect(res.success).toBe(true);
    expect(mockPrisma.studentProfile.update).toHaveBeenCalledWith({
      where: { id: "sp-1" },
      data: expect.objectContaining({
        isPublicPassportEnabled: false,
        showRatings: true,
        showAchievements: true,
      }),
    });
  });

  it("6. issueStudentCertificate — rejects non-admin users and allows admin", async () => {
    // Non-admin test
    mockCurrentUser.mockResolvedValue({ id: "u-coach", role: Role.TEACHER });
    const failRes = await issueStudentCertificate({
      studentProfileId: "sp-1",
      title: "Test Certificate",
    });
    expect(failRes.success).toBe(false);
    expect(failRes.error).toContain("Admin role required");

    // Admin test
    mockCurrentUser.mockResolvedValue({ id: "u-admin", role: Role.ADMIN });
    mockPrisma.studentCertificate.create.mockResolvedValue({
      id: "cert-new",
      certificateNumber: "SMC-CERT-2026-123456",
    });

    const successRes = await issueStudentCertificate({
      studentProfileId: "sp-1",
      title: "Tactical Blitz Champion 2026",
      category: "TOURNAMENT_WIN",
      description: "First place in SMC October Blitz Championship.",
    });

    expect(successRes.success).toBe(true);
    expect(successRes.certificateId).toBe("cert-new");
    expect(mockPrisma.studentCertificate.create).toHaveBeenCalled();
  });

  it("7. deleteStudentCertificate — allows admin to revoke certificate", async () => {
    mockCurrentUser.mockResolvedValue({ id: "u-admin", role: Role.ADMIN });
    mockPrisma.studentCertificate.delete.mockResolvedValue({ id: "cert-1" });

    const res = await deleteStudentCertificate("cert-1");
    expect(res.success).toBe(true);
    expect(mockPrisma.studentCertificate.delete).toHaveBeenCalledWith({
      where: { id: "cert-1" },
    });
  });
});
