// Plain, dependency-free mirrors of the Prisma-generated `Role` and `Weekday`
// enums (same underlying string values). App code — including Client
// Components — should import enums from here instead of from
// `@/generated/prisma/client`, which pulls in the Prisma runtime (and
// Node-only built-ins) that cannot be bundled for the browser.
//
// These stay structurally compatible with the Prisma-generated types, so
// they can still be passed straight into Prisma queries.

export const Role = {
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const Weekday = {
  MONDAY: 'MONDAY',
  TUESDAY: 'TUESDAY',
  WEDNESDAY: 'WEDNESDAY',
  THURSDAY: 'THURSDAY',
  FRIDAY: 'FRIDAY',
  SATURDAY: 'SATURDAY',
  SUNDAY: 'SUNDAY',
} as const;

export type Weekday = (typeof Weekday)[keyof typeof Weekday];

export const AttendanceStatus = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
} as const;

export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

export const BatchType = {
  GROUP_SESSION: 'GROUP_SESSION',
  ONE_ON_ONE_SESSION: 'ONE_ON_ONE_SESSION',
  DEMO_SESSION: 'DEMO_SESSION',
  SUBSTITUTE_SESSION: 'SUBSTITUTE_SESSION',
  PTM: 'PTM',
  MASTERCLASS: 'MASTERCLASS',
  RECURRING: 'RECURRING',
  DEMO: 'DEMO',
  TRIAL: 'TRIAL',
  REPLACEMENT: 'REPLACEMENT',
} as const;

export type BatchType = (typeof BatchType)[keyof typeof BatchType];

export const StudentLevel = {
  BEGINNER: 'BEGINNER',
  CORE_1: 'CORE_1',
  CORE_2: 'CORE_2',
  CORE_3: 'CORE_3',
  CORE_4: 'CORE_4',
  INTERMEDIATE_1: 'INTERMEDIATE_1',
  INTERMEDIATE_2: 'INTERMEDIATE_2',
  INTERMEDIATE_3: 'INTERMEDIATE_3',
  ADVANCE_1: 'ADVANCE_1',
  ADVANCE_2: 'ADVANCE_2',
  ELITE: 'ELITE',
} as const;

export type StudentLevel = (typeof StudentLevel)[keyof typeof StudentLevel];

export const TicketStatus = {
  PENDING: 'PENDING',
  RESOLVED: 'RESOLVED',
} as const;

export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const TicketCategory = {
  TECHNICAL_ISSUE: 'TECHNICAL_ISSUE',
  PAYMENT_ISSUE: 'PAYMENT_ISSUE',
  RESCHEDULING: 'RESCHEDULING',
  BATCH_ISSUE: 'BATCH_ISSUE',
  COACH_ISSUE: 'COACH_ISSUE',
  STUDENT_ISSUE: 'STUDENT_ISSUE',
  OTHER: 'OTHER',
} as const;

export type TicketCategory = (typeof TicketCategory)[keyof typeof TicketCategory];
