import { calculatePenalty } from '../src/lib/penalty-engine';

const CLASS_START = new Date('2026-09-17T10:00:00.000Z');
const CLASS_COMPLETED = new Date('2026-09-17T11:00:00.000Z');
const MIN = 60 * 1000;
const HOUR = 60 * MIN;

const defaultInput = {
  classScheduledStart: CLASS_START,
  classCompletedAt: CLASS_COMPLETED,
  attendanceMarkedAt: new Date(CLASS_COMPLETED.getTime() + 1 * HOUR),
  coachJoinedAt: CLASS_START,
  totalFeedbacksSubmitted: 5,
  cameraOffReports: 0,
  phoneUsageReports: 0,
  totalStudents: 5,
  historicalPhonePenaltyCount: 0,
};

const cases = [
  {
    id: 1,
    desc: 'On-time join (10:00)',
    input: { ...defaultInput },
  },
  {
    id: 2,
    desc: 'Late join (10:10)',
    input: { ...defaultInput, coachJoinedAt: new Date(CLASS_START.getTime() + 10 * MIN) },
  },
  {
    id: 3,
    desc: 'Early join (09:55)',
    input: { ...defaultInput, coachJoinedAt: new Date(CLASS_START.getTime() - 5 * MIN) },
  },
  {
    id: 4,
    desc: 'Attendance within 24h (next day 10:00)',
    input: { ...defaultInput, attendanceMarkedAt: new Date(CLASS_COMPLETED.getTime() + 23 * HOUR) },
  },
  {
    id: 5,
    desc: 'Attendance >24h (next day 12:00)',
    input: { ...defaultInput, attendanceMarkedAt: new Date(CLASS_COMPLETED.getTime() + 25 * HOUR) },
  },
  {
    id: 6,
    desc: 'No attendance (>24h passed)',
    input: { ...defaultInput, attendanceMarkedAt: null, classCompletedAt: new Date(Date.now() - 48 * HOUR) },
  },
  {
    id: 7,
    desc: 'Camera <80% (3/5 off)',
    input: { ...defaultInput, cameraOffReports: 3 },
  },
  {
    id: 8,
    desc: 'Camera >=80% (4/5 off)',
    input: { ...defaultInput, cameraOffReports: 4 },
  },
  {
    id: 9,
    desc: 'Phone <80% (3/5 used)',
    input: { ...defaultInput, phoneUsageReports: 3 },
  },
  {
    id: 10,
    desc: 'Phone 1st occurrence >=80% (4/5, hist=0)',
    input: { ...defaultInput, phoneUsageReports: 4, historicalPhonePenaltyCount: 0 },
  },
  {
    id: 11,
    desc: 'Phone 2nd occurrence >=80% (4/5, hist=1)',
    input: { ...defaultInput, phoneUsageReports: 4, historicalPhonePenaltyCount: 1 },
  },
  {
    id: 12,
    desc: 'Phone 3rd occurrence >=80% (4/5, hist=2)',
    input: { ...defaultInput, phoneUsageReports: 4, historicalPhonePenaltyCount: 2 },
  },
  {
    id: 13,
    desc: 'Multiple penalties (Late 10m + att>24h + cam 4/5 + phone 4/5 hist=2)',
    input: { 
      ...defaultInput, 
      coachJoinedAt: new Date(CLASS_START.getTime() + 10 * MIN),
      attendanceMarkedAt: new Date(CLASS_COMPLETED.getTime() + 25 * HOUR),
      cameraOffReports: 4,
      phoneUsageReports: 4,
      historicalPhonePenaltyCount: 2
    },
  },
  {
    id: 14,
    desc: 'No Join event (coachJoinedAt=null)',
    input: { ...defaultInput, coachJoinedAt: null },
  },
];

console.log('| Test case | Input / Situation | Actual Response (totalPenalty) | Actual Breakdown |');
console.log('| :--- | :--- | :--- | :--- |');

for (const c of cases) {
  const result = calculatePenalty(c.input);
  const breakdownStr = result.breakdown.length > 0 ? result.breakdown.join('<br>') : 'No penalty';
  console.log(`| ${c.id} | ${c.desc} | ₹${result.totalPenalty} | ${breakdownStr} (hasPhone=${result.hasPhonePenalty}) |`);
}
