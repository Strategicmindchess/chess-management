/**
 * Unit Tests — penalty-engine.ts
 *
 * Level 1: Pure logic. No database. No mocks. The engine is a plain function.
 *
 * Test Groups:
 *  A. Late Join Penalty — boundary conditions at exactly 0/2/5/10 min
 *  B. Attendance Deadline — 24h boundary, null attendanceMarkedAt, on-time
 *  C. Camera OFF Consensus — 0%, 50%, 79%, 80%, 100% report rates
 *  D. Phone Usage (Progressive) — occurrences 1/2/3/4
 *  E. Phone Historical Count — must NOT include current class in history
 *  F. Combined Penalties — multiple penalties in one class
 *  G. Zero Feedback — engine handles 0 submitted feedbacks gracefully
 *  H. hasPhonePenalty flag — set correctly for all phone scenarios
 */

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { calculatePenalty, PENALTY_RULES } from '@/lib/penalty-engine';
import { buildInput, CLASS_START, CLASS_END, MIN, HOUR } from './helpers';

// ─── A. Late Join Penalty ──────────────────────────────────────────────────────
describe('A. Late Join Penalty', () => {
  it('A1 — exactly on time (0 min late) → ₹0', () => {
    const result = calculatePenalty(buildInput({ coachJoinedAt: CLASS_START }));
    expect(result.totalPenalty).toBe(0);
  });

  it('A2 — 1 minute late → ₹0 (within 0-2 range)', () => {
    const result = calculatePenalty(buildInput({
      coachJoinedAt: new Date(CLASS_START.getTime() + 1 * MIN),
    }));
    expect(result.totalPenalty).toBe(0);
  });

  it('A3 — exactly 2 minutes late → ₹0 (boundary: 0-2 is inclusive of 2 → check)', () => {
    // Rule: 0–2 min = ₹0, 2–5 min = ₹100. At exactly 2 min, minMins=2 matches tier 2.
    const result = calculatePenalty(buildInput({
      coachJoinedAt: new Date(CLASS_START.getTime() + 2 * MIN),
    }));
    // Tier 2: minMins=2, so 2 min matches ₹100
    expect(result.totalPenalty).toBe(100);
  });

  it('A4 — 3 minutes late → ₹100', () => {
    const result = calculatePenalty(buildInput({
      coachJoinedAt: new Date(CLASS_START.getTime() + 3 * MIN),
    }));
    expect(result.totalPenalty).toBe(100);
  });

  it('A5 — exactly 5 minutes late → matches tier 3 (₹200)', () => {
    const result = calculatePenalty(buildInput({
      coachJoinedAt: new Date(CLASS_START.getTime() + 5 * MIN),
    }));
    expect(result.totalPenalty).toBe(200);
  });

  it('A6 — 7 minutes late → ₹200', () => {
    const result = calculatePenalty(buildInput({
      coachJoinedAt: new Date(CLASS_START.getTime() + 7 * MIN),
    }));
    expect(result.totalPenalty).toBe(200);
  });

  it('A7 — exactly 10 minutes late → ₹500', () => {
    const result = calculatePenalty(buildInput({
      coachJoinedAt: new Date(CLASS_START.getTime() + 10 * MIN),
    }));
    expect(result.totalPenalty).toBe(500);
  });

  it('A8 — 45 minutes late → ₹500', () => {
    const result = calculatePenalty(buildInput({
      coachJoinedAt: new Date(CLASS_START.getTime() + 45 * MIN),
    }));
    expect(result.totalPenalty).toBe(500);
  });

  it('A9 — coachJoinedAt is null → no late join penalty', () => {
    const result = calculatePenalty(buildInput({ coachJoinedAt: null }));
    expect(result.breakdown.some(b => b.includes('Late join'))).toBe(false);
  });

  it('A10 — coachJoinedAt before start (joined early) → ₹0', () => {
    const result = calculatePenalty(buildInput({
      coachJoinedAt: new Date(CLASS_START.getTime() - 5 * MIN),
    }));
    expect(result.totalPenalty).toBe(0);
    expect(result.breakdown.some(b => b.includes('Late join'))).toBe(false);
  });
  it('A11 — exactly 2 min + 1 sec late → ₹100', () => {
  const result = calculatePenalty(buildInput({
    coachJoinedAt: new Date(CLASS_START.getTime() + 2 * MIN + 1_000),
  }));

  expect(result.totalPenalty).toBe(100);
});

it('A12 — exactly 5 min + 1 sec late → ₹200', () => {
  const result = calculatePenalty(buildInput({
    coachJoinedAt: new Date(CLASS_START.getTime() + 5 * MIN + 1_000),
  }));

  expect(result.totalPenalty).toBe(200);
});

it('A13 — exactly 10 min + 1 sec late → ₹500', () => {
  const result = calculatePenalty(buildInput({
    coachJoinedAt: new Date(CLASS_START.getTime() + 10 * MIN + 1_000),
  }));

  expect(result.totalPenalty).toBe(500);
});
});

// ─── B. Attendance Deadline Penalty ───────────────────────────────────────────
describe('B. Attendance Deadline', () => {
  it('B1 — marked 1h after class → ₹0 (well within 24h)', () => {
    const result = calculatePenalty(buildInput({
      attendanceMarkedAt: new Date(CLASS_END.getTime() + 1 * HOUR),
    }));
    expect(result.breakdown.some(b => b.includes('ttendance'))).toBe(false);
    expect(result.totalPenalty).toBe(0);
  });

  it('B2 — marked exactly 24h after class → ₹0 (boundary: > 24h triggers penalty)', () => {
    const result = calculatePenalty(buildInput({
      attendanceMarkedAt: new Date(CLASS_END.getTime() + 24 * HOUR),
    }));
    expect(result.breakdown.some(b => b.includes('ttendance'))).toBe(false);
  });

  it('B3 — marked 24h + 1 min after class → ₹200', () => {
    const result = calculatePenalty(buildInput({
      attendanceMarkedAt: new Date(CLASS_END.getTime() + 24 * HOUR + 1 * MIN),
    }));
    expect(result.totalPenalty).toBe(200);
    expect(result.breakdown.some(b => b.includes('ttendance'))).toBe(true);
  });

  it('B4 — marked 48h after class → ₹200', () => {
    const result = calculatePenalty(buildInput({
      attendanceMarkedAt: new Date(CLASS_END.getTime() + 48 * HOUR),
    }));
    expect(result.totalPenalty).toBe(200);
  });

  it('B5 — attendanceMarkedAt is null AND class ended > 24h ago → ₹200', () => {
    // Use a class that "completed" 30 hours ago relative to now
    const thirtyHoursAgo = new Date(Date.now() - 30 * HOUR);
    const result = calculatePenalty(buildInput({
      attendanceMarkedAt: null,
      classCompletedAt: thirtyHoursAgo,
      coachJoinedAt: null, // avoid late join interference
    }));
    expect(result.totalPenalty).toBe(200);
    expect(result.breakdown.some(b => b.includes('never marked'))).toBe(true);
  });

  it('B6 — attendanceMarkedAt is null AND class ended < 24h ago → ₹0', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * HOUR);
    const result = calculatePenalty(buildInput({
      attendanceMarkedAt: null,
      classCompletedAt: twoHoursAgo,
      coachJoinedAt: null,
    }));
    expect(result.breakdown.some(b => b.includes('ttendance'))).toBe(false);
    expect(result.totalPenalty).toBe(0);
  });
  it('B7 — attendance marked exactly 24h + 1ms late → ₹200', () => {
  const result = calculatePenalty(buildInput({
    attendanceMarkedAt: new Date(
      CLASS_END.getTime() + 24 * HOUR + 1
    ),
  }));

  expect(result.totalPenalty).toBe(200);
});
});

// ─── C. Camera OFF Consensus ───────────────────────────────────────────────────
describe('C. Camera OFF Consensus (80% threshold, min 2 reports)', () => {
  it('C1 — 0 reports out of 10 → ₹0', () => {
    const result = calculatePenalty(buildInput({ cameraOffReports: 0, totalFeedbacksSubmitted: 10 }));
    expect(result.breakdown.some(b => b.includes('Camera'))).toBe(false);
  });

  it('C2 — 1 report out of 10 (10%) → ₹0 (below threshold AND below min 2)', () => {
    const result = calculatePenalty(buildInput({ cameraOffReports: 1, totalFeedbacksSubmitted: 10 }));
    expect(result.breakdown.some(b => b.includes('Camera'))).toBe(false);
  });

  it('C3 — 2 reports out of 10 (20%) → ₹0 (meets min 2 but below 80%)', () => {
    const result = calculatePenalty(buildInput({ cameraOffReports: 2, totalFeedbacksSubmitted: 10 }));
    expect(result.breakdown.some(b => b.includes('Camera'))).toBe(false);
  });

  it('C4 — 7 reports out of 10 (70%) → ₹0 (just below 80%)', () => {
    const result = calculatePenalty(buildInput({ cameraOffReports: 7, totalFeedbacksSubmitted: 10 }));
    expect(result.breakdown.some(b => b.includes('Camera'))).toBe(false);
  });

  it('C5 — 8 reports out of 10 (80%) → ₹150 (exactly at threshold)', () => {
    const result = calculatePenalty(buildInput({ cameraOffReports: 8, totalFeedbacksSubmitted: 10 }));
    expect(result.totalPenalty).toBe(PENALTY_RULES.CAMERA_OFF_PENALTY);
    expect(result.breakdown.some(b => b.includes('Camera'))).toBe(true);
  });

  it('C6 — 10 reports out of 10 (100%) → ₹150', () => {
    const result = calculatePenalty(buildInput({ cameraOffReports: 10, totalFeedbacksSubmitted: 10 }));
    expect(result.totalPenalty).toBe(PENALTY_RULES.CAMERA_OFF_PENALTY);
  });

  it('C7 — 2 reports out of 2 (100%) → ₹150 (1-to-1 style: 2 is min required)', () => {
    const result = calculatePenalty(buildInput({ cameraOffReports: 2, totalFeedbacksSubmitted: 2 }));
    expect(result.totalPenalty).toBe(PENALTY_RULES.CAMERA_OFF_PENALTY);
  });

  it('C8 — 1 report out of 1 → ₹0 (fails minimum 2 reports rule)', () => {
    const result = calculatePenalty(buildInput({ cameraOffReports: 1, totalFeedbacksSubmitted: 1 }));
    expect(result.breakdown.some(b => b.includes('Camera'))).toBe(false);
  });

  it('C9 — 0 feedbacks submitted → ₹0 (no data at all)', () => {
    const result = calculatePenalty(buildInput({ cameraOffReports: 0, totalFeedbacksSubmitted: 0 }));
    expect(result.breakdown.some(b => b.includes('Camera'))).toBe(false);
    expect(result.totalPenalty).toBe(0);
  });
  it('C10 — 7/9 reports = 77.8% → ₹0', () => {
  const result = calculatePenalty(buildInput({
    cameraOffReports: 7,
    totalFeedbacksSubmitted: 9,
  }));

  expect(result.totalPenalty).toBe(0);
});

it('C11 — 8/9 reports = 88.9% → ₹150', () => {
  const result = calculatePenalty(buildInput({
    cameraOffReports: 8,
    totalFeedbacksSubmitted: 9,
  }));

  expect(result.totalPenalty).toBe(PENALTY_RULES.CAMERA_OFF_PENALTY);
});

it('C12 — 2/3 reports = 66.7% → ₹0', () => {
  const result = calculatePenalty(buildInput({
    cameraOffReports: 2,
    totalFeedbacksSubmitted: 3,
  }));

  expect(result.totalPenalty).toBe(0);
});
});

// ─── D. Phone Usage Penalty (Progressive) ─────────────────────────────────────
describe('D. Phone Usage — Progressive Occurrence Penalty', () => {
  // Helper: 8/10 feedbacks (80%) report phone usage — threshold met
  const phoneBase = { phoneUsageReports: 8, totalFeedbacksSubmitted: 10 };

  it('D1 — 1st occurrence (historicalCount=0) → ₹0, but hasPhonePenalty=true', () => {
    const result = calculatePenalty(buildInput({ ...phoneBase, historicalPhonePenaltyCount: 0 }));
    expect(result.totalPenalty).toBe(0);
    expect(result.hasPhonePenalty).toBe(true);
    expect(result.breakdown.some(b => b.includes('₹0'))).toBe(true);
  });

  it('D2 — 2nd occurrence (historicalCount=1) → ₹0, hasPhonePenalty=true', () => {
    const result = calculatePenalty(buildInput({ ...phoneBase, historicalPhonePenaltyCount: 1 }));
    expect(result.totalPenalty).toBe(0);
    expect(result.hasPhonePenalty).toBe(true);
  });

  it('D3 — 3rd occurrence (historicalCount=2) → ₹250', () => {
    const result = calculatePenalty(buildInput({ ...phoneBase, historicalPhonePenaltyCount: 2 }));
    expect(result.totalPenalty).toBe(PENALTY_RULES.PHONE_USE_PENALTY);
    expect(result.hasPhonePenalty).toBe(true);
    expect(result.breakdown.some(b => b.includes('₹250'))).toBe(true);
  });

  it('D4 — 4th occurrence (historicalCount=3) → ₹250', () => {
    const result = calculatePenalty(buildInput({ ...phoneBase, historicalPhonePenaltyCount: 3 }));
    expect(result.totalPenalty).toBe(PENALTY_RULES.PHONE_USE_PENALTY);
  });

  it('D5 — 10th occurrence (historicalCount=9) → ₹250', () => {
    const result = calculatePenalty(buildInput({ ...phoneBase, historicalPhonePenaltyCount: 9 }));
    expect(result.totalPenalty).toBe(PENALTY_RULES.PHONE_USE_PENALTY);
  });

  it('D6 — phone reports below threshold (50%) → ₹0 and hasPhonePenalty=false', () => {
    const result = calculatePenalty(buildInput({
      phoneUsageReports: 5,
      totalFeedbacksSubmitted: 10,
      historicalPhonePenaltyCount: 5, // would be penalized if threshold was met
    }));
    expect(result.hasPhonePenalty).toBe(false);
    expect(result.totalPenalty).toBe(0);
  });
  it('D7 — 7/10 phone reports = 70% → no phone penalty', () => {
  const result = calculatePenalty(buildInput({
    phoneUsageReports: 7,
    totalFeedbacksSubmitted: 10,
    historicalPhonePenaltyCount: 5,
  }));

  expect(result.totalPenalty).toBe(0);
  expect(result.hasPhonePenalty).toBe(false);
});

it('D8 — 8/10 phone reports = exactly 80% → violation confirmed', () => {
  const result = calculatePenalty(buildInput({
    phoneUsageReports: 8,
    totalFeedbacksSubmitted: 10,
    historicalPhonePenaltyCount: 2,
  }));

  expect(result.totalPenalty).toBe(250);
  expect(result.hasPhonePenalty).toBe(true);
});

it('D9 — 2/2 phone reports = 100% → violation confirmed', () => {
  const result = calculatePenalty(buildInput({
    phoneUsageReports: 2,
    totalFeedbacksSubmitted: 2,
    historicalPhonePenaltyCount: 2,
  }));

  expect(result.totalPenalty).toBe(250);
  expect(result.hasPhonePenalty).toBe(true);
});

it('D10 — 1/1 phone report → no violation because minimum 2 reports required', () => {
  const result = calculatePenalty(buildInput({
    phoneUsageReports: 1,
    totalFeedbacksSubmitted: 1,
    historicalPhonePenaltyCount: 2,
  }));

  expect(result.totalPenalty).toBe(0);
  expect(result.hasPhonePenalty).toBe(false);
});
});

// ─── E. Historical Phone Count MUST Exclude Current Class ─────────────────────
describe('E. Historical Phone Count Isolation', () => {
  it('E1 — historicalPhonePenaltyCount=2 means THIS class is the 3rd → ₹250', () => {
    // If current class were incorrectly counted as historical (count=3),
    // totalPhoneInstances would be 4 — result would still be 250 but the
    // breakdown would show wrong occurrence number. Check breakdown explicitly.
    const result = calculatePenalty(buildInput({
      phoneUsageReports: 8,
      totalFeedbacksSubmitted: 10,
      historicalPhonePenaltyCount: 2,
    }));
    expect(result.totalPenalty).toBe(250);
    // Breakdown must say occurrence #3, not #4
    expect(result.breakdown.some(b => b.includes('occurrence #3'))).toBe(true);
  });

  it('E2 — historicalPhonePenaltyCount=1 means THIS class is 2nd → ₹0, occurrence #2', () => {
    const result = calculatePenalty(buildInput({
      phoneUsageReports: 9,
      totalFeedbacksSubmitted: 10,
      historicalPhonePenaltyCount: 1,
    }));
    expect(result.totalPenalty).toBe(0);
    expect(result.breakdown.some(b => b.includes('occurrence #2'))).toBe(true);
  });
});

// ─── F. Combined Penalties ─────────────────────────────────────────────────────
describe('F. Combined Penalties', () => {
  it('F1 — late join + attendance late → sums correctly', () => {
    // 7 min late = ₹200, attendance 30h late = ₹200, total = ₹400
    const result = calculatePenalty(buildInput({
      coachJoinedAt: new Date(CLASS_START.getTime() + 7 * MIN),
      attendanceMarkedAt: new Date(CLASS_END.getTime() + 30 * HOUR),
    }));
    expect(result.totalPenalty).toBe(400);
    expect(result.breakdown).toHaveLength(2);
  });

  it('F2 — late join + camera off (80%+) + phone (3rd occurrence) → ₹200+₹150+₹250=₹600', () => {
    const result = calculatePenalty(buildInput({
      coachJoinedAt:           new Date(CLASS_START.getTime() + 7 * MIN), // ₹200
      attendanceMarkedAt:      new Date(CLASS_END.getTime() + 1 * HOUR),   // on time
      cameraOffReports:        8,
      phoneUsageReports:       8,
      totalFeedbacksSubmitted: 10,
      historicalPhonePenaltyCount: 2, // 3rd occurrence = ₹250
    }));
    expect(result.totalPenalty).toBe(600);
    expect(result.breakdown).toHaveLength(3);
  });

  it('F3 — all penalties at once (late + attendance + camera + phone 3rd) → ₹200+₹200+₹150+₹250=₹800', () => {
    const thirtyHoursAgo = new Date(Date.now() - 30 * HOUR);
    const result = calculatePenalty({
      coachJoinedAt:           new Date(thirtyHoursAgo.getTime() + 7 * MIN), // 7 min late
      classScheduledStart:     thirtyHoursAgo,
      attendanceMarkedAt:      new Date(thirtyHoursAgo.getTime() + 26 * HOUR), // 26h late
      classCompletedAt:        new Date(thirtyHoursAgo.getTime() + 1 * HOUR),
      totalFeedbacksSubmitted: 10,
      cameraOffReports:        9,
      phoneUsageReports:       9,
      totalStudents:           10,
      historicalPhonePenaltyCount: 2,
    });
    expect(result.totalPenalty).toBe(800);
    expect(result.breakdown).toHaveLength(4);
  });
});

// ─── G. Zero Feedback Scenarios ───────────────────────────────────────────────
describe('G. Zero Feedback / Missing Data', () => {
  it('G1 — zero feedbacks submitted → camera and phone penalties are ₹0', () => {
    const result = calculatePenalty(buildInput({
      totalFeedbacksSubmitted: 0,
      cameraOffReports: 0,
      phoneUsageReports: 0,
    }));
    expect(result.breakdown.some(b => b.includes('Camera'))).toBe(false);
    expect(result.breakdown.some(b => b.includes('Phone'))).toBe(false);
  });

  it('G2 — zero feedbacks, coach was late → only late join penalty applies', () => {
    const result = calculatePenalty(buildInput({
      coachJoinedAt: new Date(CLASS_START.getTime() + 12 * MIN), // ₹500
      totalFeedbacksSubmitted: 0,
      cameraOffReports: 0,
      phoneUsageReports: 0,
    }));
    expect(result.totalPenalty).toBe(500);
    expect(result.breakdown).toHaveLength(1);
  });

  it('G3 — all inputs null/zero → ₹0 total penalty', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * HOUR);
    const result = calculatePenalty({
      coachJoinedAt: null,
      classScheduledStart: twoHoursAgo,
      attendanceMarkedAt: null,
      classCompletedAt: twoHoursAgo,
      totalFeedbacksSubmitted: 0,
      cameraOffReports: 0,
      phoneUsageReports: 0,
      totalStudents: 0,
      historicalPhonePenaltyCount: 0,
    });
    expect(result.totalPenalty).toBe(0);
    expect(result.breakdown).toHaveLength(0);
    expect(result.hasPhonePenalty).toBe(false);
  });
});

// ─── H. hasPhonePenalty Flag ───────────────────────────────────────────────────
describe('H. hasPhonePenalty flag accuracy', () => {
  it('H1 — no phone report → false', () => {
    const result = calculatePenalty(buildInput({ phoneUsageReports: 0 }));
    expect(result.hasPhonePenalty).toBe(false);
  });

  it('H2 — phone report below consensus → false', () => {
    const result = calculatePenalty(buildInput({ phoneUsageReports: 3, totalFeedbacksSubmitted: 10 }));
    expect(result.hasPhonePenalty).toBe(false);
  });

  it('H3 — phone report at 80%, 1st occurrence → true (no ₹ penalty but still flagged)', () => {
    const result = calculatePenalty(buildInput({
      phoneUsageReports: 8,
      totalFeedbacksSubmitted: 10,
      historicalPhonePenaltyCount: 0,
    }));
    expect(result.hasPhonePenalty).toBe(true);
    expect(result.totalPenalty).toBe(0); // no monetary penalty yet
  });

  it('H4 — phone report at 80%, 3rd occurrence → true AND ₹250', () => {
    const result = calculatePenalty(buildInput({
      phoneUsageReports: 8,
      totalFeedbacksSubmitted: 10,
      historicalPhonePenaltyCount: 2,
    }));
    expect(result.hasPhonePenalty).toBe(true);
    expect(result.totalPenalty).toBe(250);
  });
});
