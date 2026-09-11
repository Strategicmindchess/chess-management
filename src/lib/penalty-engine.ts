/**
 * Penalty Engine — Pure Calculation Module
 *
 * This module contains ZERO database calls. It is a pure function that takes
 * aggregated data and returns the final penalty amount with an itemised breakdown.
 *
 * Consensus Rules (business rules):
 *  - Camera OFF penalty: applies when ≥80% of submitted feedbacks report it.
 *  - Phone usage penalty: applies when ≥80% of submitted feedbacks report it.
 *    Phone usage is PROGRESSIVE based on historicalPhoneViolations count:
 *      - 0th, 1st prior = ₹0 for this class
 *      - 2nd prior (3rd total) = ₹250
 *      - 3rd+ prior (4th+ total) = ₹250 per class
 */

export const PENALTY_RULES = {
  LATE_JOIN_TIERS: [
    { minMins: 0,  maxMins: 2,   amount: 0   },
    { minMins: 2,  maxMins: 5,   amount: 100 },
    { minMins: 5,  maxMins: 10,  amount: 200 },
    { minMins: 10, maxMins: Infinity, amount: 500 },
  ],
  ATTENDANCE_DEADLINE_HOURS: 24,
  ATTENDANCE_DEADLINE_PENALTY: 200,
  CAMERA_OFF_PENALTY: 150,
  PHONE_USE_PENALTY: 250,
  /** Fraction of submitted feedbacks that must report a violation (0.8 = 80%) */
  FEEDBACK_CONSENSUS_THRESHOLD: 0.8,
  /** Minimum number of reports needed for group classes even if 80% is met */
  FEEDBACK_CONSENSUS_MIN_REPORTS: 2,
} as const;

export interface PenaltyEngineInput {
  /** When the coach clicked "Join Class" */
  coachJoinedAt: Date | null;
  /** Scheduled class start (derived from ClassInstance.date + startTime) */
  classScheduledStart: Date;
  /** When coach clicked "Mark Held" */
  attendanceMarkedAt: Date | null;
  /** Actual class completion time (ClassInstance.completedAt or ClassLog.createdAt as fallback) */
  classCompletedAt: Date;

  // Aggregated from ClassFeedback rows for this classLog
  totalFeedbacksSubmitted: number;
  cameraOffReports: number;       // # students reporting camera OFF > 5 min
  phoneUsageReports: number;      // # students reporting phone used > 4 times
  totalStudents: number;          // Total enrolled students in the batch for this class

  /**
   * Count of PAST ClassLogs for this coach where hasPhonePenalty === true.
   * Does NOT include the current class being evaluated.
   */
  historicalPhonePenaltyCount: number;
}

export interface PenaltyEngineOutput {
  totalPenalty: number;
  /** Human-readable breakdown for penaltyNote */
  breakdown: string[];
  /**
   * Whether a phone penalty was applied in this class.
   * Used to set ClassLog.hasPhonePenalty = true.
   */
  hasPhonePenalty: boolean;
}

/** Calculate late-join penalty in ₹ given minutes late */
function calcLateJoinPenalty(lateMinutes: number): number {
  for (const tier of PENALTY_RULES.LATE_JOIN_TIERS) {
    if (lateMinutes >= tier.minMins && lateMinutes < tier.maxMins) {
      return tier.amount;
    }
  }
  return 0;
}

/** Returns true if the report count meets the consensus threshold */
function meetsConsensus(
  reports: number,
  totalSubmitted: number,
  totalStudents: number
): boolean {
  if (totalSubmitted === 0) return false;

  // 1-to-1 class: single student's report is enough
  if (totalStudents === 1) {
    return reports >= 1;
  }

  // Group class: minimum 2 reports + 80% consensus
  if (reports < PENALTY_RULES.FEEDBACK_CONSENSUS_MIN_REPORTS) return false;

  return reports / totalSubmitted >= PENALTY_RULES.FEEDBACK_CONSENSUS_THRESHOLD;
}

/** Main penalty calculation — pure function, no side effects */
export function calculatePenalty(input: PenaltyEngineInput): PenaltyEngineOutput {
  const breakdown: string[] = [];
  let totalPenalty = 0;
  let hasPhonePenalty = false;

  // ── 1. Late Join Penalty ───────────────────────────────────────────────────
  if (input.coachJoinedAt) {
    const lateMs = input.coachJoinedAt.getTime() - input.classScheduledStart.getTime();
    const lateMinutes = Math.max(0, Math.floor(lateMs / 60_000));
    const penalty = calcLateJoinPenalty(lateMinutes);
    if (penalty > 0) {
      totalPenalty += penalty;
      breakdown.push(`Late join: ${lateMinutes} min late (₹${penalty})`);
    }
  }

  // ── 2. Attendance Deadline Penalty (must mark within 24h of class completion) ─
  if (input.attendanceMarkedAt) {
    const hoursDelay =
      (input.attendanceMarkedAt.getTime() - input.classCompletedAt.getTime()) / 3_600_000;
    if (hoursDelay > PENALTY_RULES.ATTENDANCE_DEADLINE_HOURS) {
      totalPenalty += PENALTY_RULES.ATTENDANCE_DEADLINE_PENALTY;
      breakdown.push(
        `Attendance marked ${Math.floor(hoursDelay)}h after class completion (₹${PENALTY_RULES.ATTENDANCE_DEADLINE_PENALTY})`
      );
    }
  } else {
    // attendanceMarkedAt is null → coach never marked attendance
    const hoursDelay =
      (Date.now() - input.classCompletedAt.getTime()) / 3_600_000;
    if (hoursDelay > PENALTY_RULES.ATTENDANCE_DEADLINE_HOURS) {
      totalPenalty += PENALTY_RULES.ATTENDANCE_DEADLINE_PENALTY;
      breakdown.push(`Attendance never marked (₹${PENALTY_RULES.ATTENDANCE_DEADLINE_PENALTY})`);
    }
  }

  // ── 3. Camera OFF Penalty (consensus: ≥80% of submitted feedbacks) ─────────
  if (meetsConsensus(input.cameraOffReports, input.totalFeedbacksSubmitted, input.totalStudents)) {
    totalPenalty += PENALTY_RULES.CAMERA_OFF_PENALTY;
    breakdown.push(
      `Camera OFF >5 min reported by ${input.cameraOffReports}/${input.totalFeedbacksSubmitted} students (₹${PENALTY_RULES.CAMERA_OFF_PENALTY})`
    );
  }

  // ── 4. Phone Usage Penalty (progressive, consensus: ≥80% of feedbacks) ────
  if (meetsConsensus(input.phoneUsageReports, input.totalFeedbacksSubmitted, input.totalStudents)) {
    // historicalPhonePenaltyCount = how many PAST classes already had phone penalty
    // Total instances including this class = historicalPhonePenaltyCount + 1
    const totalPhoneInstances = input.historicalPhonePenaltyCount + 1;

    if (totalPhoneInstances >= 3) {
      // 3rd occurrence onward = ₹250
      totalPenalty += PENALTY_RULES.PHONE_USE_PENALTY;
      hasPhonePenalty = true;
      breakdown.push(
        `Phone use reported by ${input.phoneUsageReports}/${input.totalFeedbacksSubmitted} students ` +
        `(occurrence #${totalPhoneInstances}, ₹${PENALTY_RULES.PHONE_USE_PENALTY})`
      );
    } else {
      // 1st or 2nd occurrence — record violation but no penalty yet
      hasPhonePenalty = true;
      breakdown.push(
        `Phone use reported by ${input.phoneUsageReports}/${input.totalFeedbacksSubmitted} students ` +
        `(occurrence #${totalPhoneInstances}, ₹0 — penalty starts at 3rd instance)`
      );
    }
  }

  return { totalPenalty, breakdown, hasPhonePenalty };
}

