/**
 * Test Helpers — shared utilities used across all penalty system tests.
 *
 * buildInput() gives a valid baseline PenaltyEngineInput so each test
 * only has to override the fields it cares about.
 */

import type { PenaltyEngineInput } from '@/lib/penalty-engine';

/** Class was scheduled at this exact moment */
export const CLASS_START = new Date('2025-01-15T10:00:00.000Z');

/** Class ended 1 hour after start */
export const CLASS_END   = new Date('2025-01-15T11:00:00.000Z');

/**
 * Returns a fully valid, zero-penalty baseline input.
 * Override individual fields per test scenario.
 */
export function buildInput(overrides: Partial<PenaltyEngineInput> = {}): PenaltyEngineInput {
  return {
    coachJoinedAt:               CLASS_START,           // on time
    classScheduledStart:         CLASS_START,
    attendanceMarkedAt:          new Date(CLASS_END.getTime() + 1 * 60 * 60 * 1_000), // 1h after class = fine
    classCompletedAt:            CLASS_END,
    totalFeedbacksSubmitted:     10,
    cameraOffReports:            0,
    phoneUsageReports:           0,
    totalStudents:               10,
    historicalPhonePenaltyCount: 0,
    ...overrides,
  };
}

/** Milliseconds per minute/hour helpers */
export const MIN = 60_000;
export const HOUR = 3_600_000;
