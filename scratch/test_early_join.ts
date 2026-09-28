import { calculatePenalty } from '../src/lib/penalty-engine';

const TIME_ZONE = 'Asia/Kolkata';

// Simulated timezone conversion as done in penalty.worker.ts
// We'll just build dates directly.
const classScheduledStart = new Date('2026-09-19T14:30:00.000Z'); // 20:00 IST
const coachJoinedAt = new Date('2026-09-19T14:21:00.000Z');       // 19:51 IST
const classCompletedAt = new Date('2026-09-19T15:25:00.000Z');    // 20:55 IST
const attendanceMarkedAt = new Date('2026-09-19T15:30:00.000Z');  // Marked right after

const engineInput = {
  coachJoinedAt,
  classScheduledStart,
  attendanceMarkedAt,
  classCompletedAt,
  totalFeedbacksSubmitted: 1, // Let's say 1 feedback submitted
  cameraOffReports: 0,
  phoneUsageReports: 0,
  historicalPhonePenaltyCount: 0,
  totalStudents: 1,
};

const result = calculatePenalty(engineInput);
console.log("Input:", JSON.stringify(engineInput, null, 2));
console.log("Result:", JSON.stringify(result, null, 2));
