import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { getMediaUrl } from "@/lib/s3";

export interface PassportBadge {
  id: string;
  badgeKey: string;
  title: string;
  description: string;
  icon: string;
  category: "STREAK" | "TACTICS" | "COMPETITION" | "DEDICATION" | "MILESTONE";
  awardedAt: string;
  isUnlocked: boolean;
}

export interface PassportRatingCard {
  platform: "Chess.com" | "Lichess" | "FIDE";
  format: "Rapid" | "Blitz" | "Bullet" | "Classical" | "Puzzle" | "Standard";
  rating: number;
  gamesPlayed?: number;
  lastUpdated: string;
  sourceUrl?: string;
  isVerified?: boolean;
}

export interface PassportRatingHistoryPoint {
  date: string;
  platform: string;
  format: string;
  rating: number;
}

export interface PassportCertificateItem {
  id: string;
  certificateNumber: string;
  title: string;
  description?: string | null;
  category: string;
  issueDate: string;
  certificateUrl?: string | null;
  issuedByName?: string | null;
}

export interface PassportTournamentItem {
  id: string;
  tournamentDate: string;
  score: number;
  participation?: number | null;
  performance?: number | null;
  sportsmanship?: number | null;
  notes?: string | null;
  coachName?: string | null;
}

export interface PassportLeaderboardHighlight {
  month: string;
  rank?: number | null;
  points: number;
  rewards: string[];
}

export interface StudentPassportData {
  id: string;
  studentCode: string;
  shareSlug: string;
  publicUrl: string;
  name: string;
  profilePictureUrl: string | null;
  level: string | null;
  joiningDate: string | null;
  bio: string | null;
  coach: {
    id: string;
    name: string;
    city: string | null;
  } | null;
  batch: {
    id: string;
    name: string;
    code: string;
  } | null;
  chessAccounts: {
    chessComUsername: string | null;
    chessComVerified: boolean;
    chessComUrl: string | null;
    lichessUsername: string | null;
    lichessVerified: boolean;
    lichessUrl: string | null;
    fideId: string | null;
    fideRating: number | null;
  };
  peakRating: {
    rating: number | null;
    platform: string | null;
    format: string | null;
    date: string | null;
  };
  ratings: PassportRatingCard[];
  ratingHistory: PassportRatingHistoryPoint[];
  badges: PassportBadge[];
  certificates: PassportCertificateItem[];
  tournaments: PassportTournamentItem[];
  leaderboardHighlights: PassportLeaderboardHighlight[];
  streakDays: number;
  puzzleStats: {
    attempts: number;
    solved: number;
    accuracy: number;
  };
  privacySettings: {
    isPublicPassportEnabled: boolean;
    showRatings: boolean;
    showAchievements: boolean;
    showRatingProgress: boolean;
    showTournaments: boolean;
    showCertificates: boolean;
    showFideRating: boolean;
  };
  isOwnProfile?: boolean;
  isPrivate?: boolean;
}

/**
 * Fetch full Student Passport with role-based visibility and privacy protection.
 */
export async function getStudentPassportData(
  studentProfileId: string,
  options?: {
    viewerRole?: Role | "PUBLIC";
    viewerUserId?: string;
  }
): Promise<StudentPassportData | null> {
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentProfileId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          profilePictureUrl: true,
          isActive: true,
          createdAt: true,
        },
      },
      assignedCoach: {
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      },
      enrollments: {
        where: { batch: { isActive: true } },
        include: {
          batch: true,
        },
        take: 1,
      },
      chessAccount: true,
      stats: true,
      activitySnapshots: {
        orderBy: { periodStart: "desc" },
        take: 6,
      },
      certificates: {
        include: {
          issuedBy: {
            select: { name: true },
          },
        },
        orderBy: { issueDate: "desc" },
      },
      customBadges: {
        orderBy: { awardedAt: "desc" },
      },
      ratingHistories: {
        orderBy: { recordedAt: "asc" },
        take: 20,
      },
      tournamentScores: {
        include: {
          coach: {
            include: {
              user: { select: { name: true } },
            },
          },
        },
        orderBy: { tournamentDate: "desc" },
        take: 10,
      },
      leaderboardEntries: {
        where: { periodType: "MONTHLY" },
        orderBy: { periodStart: "desc" },
        take: 6,
      },
      leaderboardRewards: {
        where: { periodType: "MONTHLY" },
        orderBy: { periodStart: "desc" },
      },
      chocolateEligibility: {
        where: { isEligible: true },
        take: 1,
      },
      puzzleSolverAwards: {
        take: 1,
      },
    },
  });

  if (!student || !student.user) {
    return null;
  }

  const isOwner = options?.viewerUserId === student.userId;
  const isAdmin = options?.viewerRole === Role.ADMIN;
  const isCoach = options?.viewerRole === Role.TEACHER;
  const isPublicViewer = options?.viewerRole === "PUBLIC" || (!isOwner && !isAdmin && !isCoach);

  // If public viewer and public passport is disabled, return privacy-masked object
  if (isPublicViewer && !student.isPublicPassportEnabled) {
    return {
      id: student.id,
      studentCode: student.studentCode || "SMC-STUDENT",
      shareSlug: student.shareSlug || student.id,
      publicUrl: `/passport/${student.shareSlug || student.id}`,
      name: student.user.name,
      profilePictureUrl: getMediaUrl(student.user.profilePictureUrl),
      level: student.level,
      joiningDate: null,
      bio: null,
      coach: null,
      batch: null,
      chessAccounts: {
        chessComUsername: null,
        chessComVerified: false,
        chessComUrl: null,
        lichessUsername: null,
        lichessVerified: false,
        lichessUrl: null,
        fideId: null,
        fideRating: null,
      },
      peakRating: { rating: null, platform: null, format: null, date: null },
      ratings: [],
      ratingHistory: [],
      badges: [],
      certificates: [],
      tournaments: [],
      leaderboardHighlights: [],
      streakDays: 0,
      puzzleStats: { attempts: 0, solved: 0, accuracy: 0 },
      privacySettings: {
        isPublicPassportEnabled: false,
        showRatings: false,
        showAchievements: false,
        showRatingProgress: false,
        showTournaments: false,
        showCertificates: false,
        showFideRating: false,
      },
      isOwnProfile: false,
      isPrivate: true,
    };
  }

  // Active Batch & Coach
  const activeBatch = student.enrollments[0]?.batch || null;
  const assignedCoach = student.assignedCoach
    ? {
        id: student.assignedCoach.id,
        name: student.assignedCoach.user.name,
        city: student.assignedCoach.city,
      }
    : null;

  // Chess Accounts
  const ccUser = student.chessAccount?.chessComUsername || student.chessComId || null;
  const liUser = student.chessAccount?.lichessUsername || student.lichessId || null;
  const ccVerified = student.chessAccount?.chessComVerified ?? !!student.chessComId;
  const liVerified = student.chessAccount?.lichessVerified ?? !!student.lichessId;

  // Build current ratings list
  const ratings: PassportRatingCard[] = [];
  const stats = student.stats;
  const lastSyncStr = stats?.lastSyncedAt?.toISOString() || new Date().toISOString();

  // Chess.com ratings
  if (ccUser) {
    if (stats?.ccRapidRating) {
      ratings.push({
        platform: "Chess.com",
        format: "Rapid",
        rating: stats.ccRapidRating,
        gamesPlayed: stats.ccTotalRapid ?? undefined,
        lastUpdated: lastSyncStr,
        sourceUrl: `https://www.chess.com/member/${encodeURIComponent(ccUser)}`,
        isVerified: ccVerified,
      });
    } else if (student.chessComRating) {
      ratings.push({
        platform: "Chess.com",
        format: "Rapid",
        rating: student.chessComRating,
        lastUpdated: lastSyncStr,
        sourceUrl: `https://www.chess.com/member/${encodeURIComponent(ccUser)}`,
        isVerified: ccVerified,
      });
    }

    if (stats?.ccBlitzRating) {
      ratings.push({
        platform: "Chess.com",
        format: "Blitz",
        rating: stats.ccBlitzRating,
        gamesPlayed: stats.ccTotalBlitz ?? undefined,
        lastUpdated: lastSyncStr,
        sourceUrl: `https://www.chess.com/member/${encodeURIComponent(ccUser)}`,
        isVerified: ccVerified,
      });
    }

    if (stats?.ccBulletRating) {
      ratings.push({
        platform: "Chess.com",
        format: "Bullet",
        rating: stats.ccBulletRating,
        gamesPlayed: stats.ccTotalBullet ?? undefined,
        lastUpdated: lastSyncStr,
        sourceUrl: `https://www.chess.com/member/${encodeURIComponent(ccUser)}`,
        isVerified: ccVerified,
      });
    }

    if (stats?.ccPuzzleRating) {
      ratings.push({
        platform: "Chess.com",
        format: "Puzzle",
        rating: stats.ccPuzzleRating,
        lastUpdated: lastSyncStr,
        sourceUrl: `https://www.chess.com/member/${encodeURIComponent(ccUser)}`,
        isVerified: ccVerified,
      });
    }
  }

  // Lichess ratings
  if (liUser) {
    if (stats?.liRapidRating) {
      ratings.push({
        platform: "Lichess",
        format: "Rapid",
        rating: stats.liRapidRating,
        gamesPlayed: stats.liTotalRapid ?? undefined,
        lastUpdated: lastSyncStr,
        sourceUrl: `https://lichess.org/@/${encodeURIComponent(liUser)}`,
        isVerified: liVerified,
      });
    } else if (student.lichessRating) {
      ratings.push({
        platform: "Lichess",
        format: "Rapid",
        rating: student.lichessRating,
        lastUpdated: lastSyncStr,
        sourceUrl: `https://lichess.org/@/${encodeURIComponent(liUser)}`,
        isVerified: liVerified,
      });
    }

    if (stats?.liBlitzRating) {
      ratings.push({
        platform: "Lichess",
        format: "Blitz",
        rating: stats.liBlitzRating,
        gamesPlayed: stats.liTotalBlitz ?? undefined,
        lastUpdated: lastSyncStr,
        sourceUrl: `https://lichess.org/@/${encodeURIComponent(liUser)}`,
        isVerified: liVerified,
      });
    }

    if (stats?.liBulletRating) {
      ratings.push({
        platform: "Lichess",
        format: "Bullet",
        rating: stats.liBulletRating,
        gamesPlayed: stats.liTotalBullet ?? undefined,
        lastUpdated: lastSyncStr,
        sourceUrl: `https://lichess.org/@/${encodeURIComponent(liUser)}`,
        isVerified: liVerified,
      });
    }

    if (stats?.liPuzzleRating) {
      ratings.push({
        platform: "Lichess",
        format: "Puzzle",
        rating: stats.liPuzzleRating,
        lastUpdated: lastSyncStr,
        sourceUrl: `https://lichess.org/@/${encodeURIComponent(liUser)}`,
        isVerified: liVerified,
      });
    }
  }

  // FIDE Rating (clearly distinguished from online)
  if (student.fideRating && (!isPublicViewer || student.showFideRating)) {
    ratings.push({
      platform: "FIDE",
      format: "Standard",
      rating: student.fideRating,
      lastUpdated: student.updatedAt.toISOString(),
      sourceUrl: student.fideId ? `https://ratings.fide.com/profile/${student.fideId}` : undefined,
      isVerified: !!student.fideId,
    });
  }

  // Determine Peak Rating
  let peak = student.peakRating ? {
    rating: student.peakRating,
    platform: student.peakRatingPlatform || "Online",
    format: student.peakRatingFormat || "Rapid",
    date: student.peakRatingDate?.toISOString() || null,
  } : null;

  if (!peak && ratings.length > 0) {
    const highestCard = [...ratings].sort((a, b) => b.rating - a.rating)[0];
    if (highestCard) {
      peak = {
        rating: highestCard.rating,
        platform: highestCard.platform,
        format: highestCard.format,
        date: highestCard.lastUpdated,
      };
    }
  }

  // Rating Progression History
  const historyPoints: PassportRatingHistoryPoint[] = [];

  // Use explicit rating histories if present
  if (student.ratingHistories.length > 0) {
    student.ratingHistories.forEach((h) => {
      historyPoints.push({
        date: h.recordedAt.toISOString().split("T")[0],
        platform: h.platform,
        format: h.format,
        rating: h.rating,
      });
    });
  } else {
    // Generate from activity snapshots
    student.activitySnapshots.forEach((snap) => {
      const dateStr = snap.periodStart.toISOString().split("T")[0];
      if (snap.rapidRatingEnd) {
        historyPoints.push({
          date: dateStr,
          platform: "Combined",
          format: "Rapid",
          rating: snap.rapidRatingEnd,
        });
      }
    });
  }

  // Calculate Streak & Puzzle Stats
  const latestSnapshot = student.activitySnapshots[0] || null;
  const streakDays = Math.max(
    stats?.ccStreak || 0,
    stats?.liStreak || 0,
    latestSnapshot?.streakDays || 0
  );

  let totalAttempts = 0;
  let totalSolved = 0;
  student.activitySnapshots.forEach((snap) => {
    totalAttempts += snap.puzzleAttempts || 0;
    totalSolved += snap.puzzleSolved || 0;
  });
  const puzzleAccuracy = totalAttempts > 0 ? Math.round((totalSolved / totalAttempts) * 100) : 0;

  // Compute Achievements & Badges
  const badges: PassportBadge[] = [];

  // 1. Streak Badges
  if (streakDays >= 7) {
    badges.push({
      id: "b-streak-7",
      badgeKey: "STREAK_7",
      title: "7-Day Flame",
      description: "Maintained a continuous 7-day daily chess practice streak.",
      icon: "flame",
      category: "STREAK",
      awardedAt: new Date().toISOString(),
      isUnlocked: true,
    });
  }
  if (streakDays >= 14) {
    badges.push({
      id: "b-streak-14",
      badgeKey: "STREAK_14",
      title: "14-Day Iron Will",
      description: "2 weeks of relentless daily chess training across platforms.",
      icon: "zap",
      category: "STREAK",
      awardedAt: new Date().toISOString(),
      isUnlocked: true,
    });
  }
  if (streakDays >= 30) {
    badges.push({
      id: "b-streak-30",
      badgeKey: "STREAK_30",
      title: "30-Day Master Habit",
      description: "A full month of non-stop chess excellence and daily games.",
      icon: "crown",
      category: "STREAK",
      awardedAt: new Date().toISOString(),
      isUnlocked: true,
    });
  }

  // 2. Tactics Badges
  if (totalSolved >= 50) {
    badges.push({
      id: "b-tactic-50",
      badgeKey: "PUZZLE_50",
      title: "Tactical Novice",
      description: "Solved over 50 rated chess tactics and puzzles.",
      icon: "target",
      category: "TACTICS",
      awardedAt: new Date().toISOString(),
      isUnlocked: true,
    });
  }
  if (totalSolved >= 100 || student.puzzleSolverAwards.length > 0) {
    badges.push({
      id: "b-tactic-100",
      badgeKey: "PUZZLE_100",
      title: "Tactical Centurion",
      description: "Mastered 100+ puzzles with sharp precision and calculation.",
      icon: "shield",
      category: "TACTICS",
      awardedAt: new Date().toISOString(),
      isUnlocked: true,
    });
  }
  if (totalSolved >= 250) {
    badges.push({
      id: "b-tactic-250",
      badgeKey: "PUZZLE_250",
      title: "Tactical Grandmaster",
      description: "Over 250 verified tactics solved across training sessions.",
      icon: "sparkles",
      category: "TACTICS",
      awardedAt: new Date().toISOString(),
      isUnlocked: true,
    });
  }

  // 3. Chocolate Challenge Badge
  if (student.chocolateEligibility.length > 0) {
    badges.push({
      id: "b-choco-master",
      badgeKey: "CHOCOLATE_CHAMPION",
      title: "Chocolate Club Elite",
      description: "Achieved 38+ points in classroom chocolate question challenges.",
      icon: "gift",
      category: "DEDICATION",
      awardedAt: new Date().toISOString(),
      isUnlocked: true,
    });
  }

  // 4. Tournament Badges
  if (student.tournamentScores.length > 0) {
    badges.push({
      id: "b-tourney-fighter",
      badgeKey: "TOURNAMENT_WARRIOR",
      title: "Tournament Fighter",
      description: "Actively participated in official SMC weekly online tournaments.",
      icon: "swords",
      category: "COMPETITION",
      awardedAt: student.tournamentScores[0].tournamentDate.toISOString(),
      isUnlocked: true,
    });
  }

  // 5. Leaderboard Badges
  const hasPodium = student.leaderboardEntries.some((e) => e.rank && e.rank <= 3);
  const hasTop10 = student.leaderboardEntries.some((e) => e.rank && e.rank <= 10);
  if (hasPodium) {
    badges.push({
      id: "b-podium",
      badgeKey: "LEADERBOARD_PODIUM",
      title: "Podium Finisher",
      description: "Reached Top 3 on the official Strategic Mind Chess monthly leaderboard.",
      icon: "trophy",
      category: "COMPETITION",
      awardedAt: new Date().toISOString(),
      isUnlocked: true,
    });
  } else if (hasTop10) {
    badges.push({
      id: "b-top10",
      badgeKey: "LEADERBOARD_TOP10",
      title: "Top 10 Contender",
      description: "Ranked among the Top 10 chess players across SMC academy.",
      icon: "medal",
      category: "COMPETITION",
      awardedAt: new Date().toISOString(),
      isUnlocked: true,
    });
  }

  // 6. Rating Club Badges
  const maxOnlineRating = Math.max(
    0,
    ...ratings.filter((r) => r.platform !== "FIDE").map((r) => r.rating)
  );
  if (maxOnlineRating >= 1500) {
    badges.push({
      id: "b-rate-1500",
      badgeKey: "RATING_1500",
      title: "1500+ Rating Club",
      description: "Reached an exceptional competitive rating milestone of 1500+.",
      icon: "award",
      category: "MILESTONE",
      awardedAt: new Date().toISOString(),
      isUnlocked: true,
    });
  } else if (maxOnlineRating >= 1200) {
    badges.push({
      id: "b-rate-1200",
      badgeKey: "RATING_1200",
      title: "1200+ Rating Club",
      description: "Advanced into the 1200+ rating tier with consistent match play.",
      icon: "award",
      category: "MILESTONE",
      awardedAt: new Date().toISOString(),
      isUnlocked: true,
    });
  } else if (maxOnlineRating >= 1000) {
    badges.push({
      id: "b-rate-1000",
      badgeKey: "RATING_1000",
      title: "1000+ Rating Club",
      description: "Crossed the milestone of 1000+ verified chess rating.",
      icon: "award",
      category: "MILESTONE",
      awardedAt: new Date().toISOString(),
      isUnlocked: true,
    });
  }

  // Add custom badges from DB
  student.customBadges.forEach((cb) => {
    badges.push({
      id: cb.id,
      badgeKey: cb.badgeKey,
      title: cb.title,
      description: cb.description,
      icon: cb.icon,
      category: cb.category as any,
      awardedAt: cb.awardedAt.toISOString(),
      isUnlocked: cb.isUnlocked,
    });
  });

  // Certificates
  const certificates: PassportCertificateItem[] = student.certificates.map((cert) => ({
    id: cert.id,
    certificateNumber: cert.certificateNumber,
    title: cert.title,
    description: cert.description,
    category: cert.category,
    issueDate: cert.issueDate.toISOString().split("T")[0],
    certificateUrl: cert.certificateUrl,
    issuedByName: cert.issuedBy?.name || "SMC Academic Council",
  }));

  // Tournaments
  const tournaments: PassportTournamentItem[] = student.tournamentScores.map((t) => ({
    id: t.id,
    tournamentDate: t.tournamentDate.toISOString().split("T")[0],
    score: t.score,
    participation: t.participation,
    performance: t.performance,
    sportsmanship: t.sportsmanship,
    notes: t.notes,
    coachName: t.coach?.user?.name || null,
  }));

  // Leaderboard Highlights
  const leaderboardHighlights: PassportLeaderboardHighlight[] = student.leaderboardEntries.map(
    (entry) => {
      const monthStr = entry.periodStart.toISOString().slice(0, 7);
      const rewardsWon = student.leaderboardRewards
        .filter((r) => r.periodStart.toISOString().slice(0, 7) === monthStr)
        .map((r) => r.rewardTitle);

      return {
        month: monthStr,
        rank: entry.rank,
        points: entry.totalScore,
        rewards: rewardsWon,
      };
    }
  );

  // Apply privacy filters if public viewer
  const finalRatings = isPublicViewer && !student.showRatings ? [] : ratings;
  const finalBadges = isPublicViewer && !student.showAchievements ? [] : badges;
  const finalHistory = isPublicViewer && !student.showRatingProgress ? [] : historyPoints;
  const finalTournaments = isPublicViewer && !student.showTournaments ? [] : tournaments;
  const finalCertificates = isPublicViewer && !student.showCertificates ? [] : certificates;

  return {
    id: student.id,
    studentCode: student.studentCode || `SMC-STU-${student.id.slice(-4).toUpperCase()}`,
    shareSlug: student.shareSlug || student.id,
    publicUrl: `/passport/${student.shareSlug || student.id}`,
    name: student.user.name,
    profilePictureUrl: getMediaUrl(student.user.profilePictureUrl),
    level: student.level,
    joiningDate: student.joiningDate ? student.joiningDate.toISOString().split("T")[0] : null,
    bio: student.bio || null,
    coach: assignedCoach,
    batch: activeBatch
      ? {
          id: activeBatch.id,
          name: activeBatch.name,
          code: activeBatch.code,
        }
      : null,
    chessAccounts: {
      chessComUsername: isPublicViewer && !student.showRatings ? null : ccUser,
      chessComVerified: ccVerified,
      chessComUrl: ccUser ? `https://www.chess.com/member/${encodeURIComponent(ccUser)}` : null,
      lichessUsername: isPublicViewer && !student.showRatings ? null : liUser,
      lichessVerified: liVerified,
      lichessUrl: liUser ? `https://lichess.org/@/${encodeURIComponent(liUser)}` : null,
      fideId: student.fideId,
      fideRating: student.fideRating,
    },
    peakRating: peak || { rating: null, platform: null, format: null, date: null },
    ratings: finalRatings,
    ratingHistory: finalHistory,
    badges: finalBadges,
    certificates: finalCertificates,
    tournaments: finalTournaments,
    leaderboardHighlights: isPublicViewer && !student.showAchievements ? [] : leaderboardHighlights,
    streakDays,
    puzzleStats: {
      attempts: totalAttempts,
      solved: totalSolved,
      accuracy: puzzleAccuracy,
    },
    privacySettings: {
      isPublicPassportEnabled: student.isPublicPassportEnabled,
      showRatings: student.showRatings,
      showAchievements: student.showAchievements,
      showRatingProgress: student.showRatingProgress,
      showTournaments: student.showTournaments,
      showCertificates: student.showCertificates,
      showFideRating: student.showFideRating,
    },
    isOwnProfile: isOwner,
    isPrivate: false,
  };
}

/**
 * Find student by shareSlug or studentCode or ID for public viewing.
 */
export async function getPublicPassportBySlugOrId(
  slugOrId: string
): Promise<StudentPassportData | null> {
  const student = await prisma.studentProfile.findFirst({
    where: {
      OR: [
        { shareSlug: slugOrId },
        { studentCode: slugOrId },
        { id: slugOrId },
      ],
    },
    select: { id: true },
  });

  if (!student) return null;
  return getStudentPassportData(student.id, { viewerRole: "PUBLIC" });
}
