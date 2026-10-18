# Technical Report & Action Plan: Attendance & Multi-Coach Switching

**Target Batch:** Core 2 bridge (`IND-GBR-1926`)  
**Scenario:** Coach 1 assigned -> Coach 2 updated for Lecture 9 (rescheduled) -> Coach 1 reassigned  
**Issue:** Attendance is cross-reflecting across both coaches' portals and reports.

---

## 1. Root Cause Breakdown (Why This Happened)

In the current codebase, there is a fundamental difference between **Batch Ownership** and **Class Execution**:

```
                  ┌───────────────────────────────┐
                  │            Batch              │
                  │   coachProfileId = Coach 1    │
                  └──────────────┬────────────────┘
                                 │ 1-to-many
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
 ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
 │ClassInstance │         │ClassInstance │         │ClassInstance │
 │  Lecture 8   │         │  Lecture 9   │         │  Lecture 10  │
 └──────┬───────┘         └──────┬───────┘         └──────┬───────┘
        ▼                        ▼                        ▼
 ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
 │   ClassLog   │         │   ClassLog   │         │   ClassLog   │
 │ coachProfile │         │ coachProfile │         │ coachProfile │
 │  = Coach 1   │         │  = Coach 2   │         │  = Coach 1   │
 └──────────────┘         └──────────────┘         └──────────────┘
```

1. **The Schema Gap:**
   - The `Batch` table stores `coachProfileId` (the long-term coach).
   - The `ClassInstance` table (individual scheduled classes) has **no** coach field. It inherits the coach from `Batch`.
   - The `ClassLog` table (the completed class record) stores `coachProfileId` (the coach who actually took the class and marked attendance).

2. **The 3 Points Where Queries Collide:**
   - **Point A (Admin Payout Batch Summary - `src/actions/payout-actions.ts:54-68`):**  
     Groups class logs by `batchId` into a single record. It picks `coachName: log.coach.user.name` from whichever log is encountered first. If Lecture 9 (Coach 2) is processed first, the **entire batch's 9 sessions** show under Coach 2's name.
   - **Point B (Teacher Dashboard vs Payouts):**  
     Teacher Dashboard queries `batch: { coachProfileId: userCoachId }` (shows all sessions of the batch to Coach 1). But Teacher Payouts queries `classLog: { coachProfileId: userCoachId }` (shows Lecture 9 to Coach 2).
   - **Point C (Admin Attendance View - `/admin/attendance/batch/[batchId]`):**  
     The page header displays `batch.coach.user.name` (Coach 1), but inside the table row for Lecture 9 it displays Coach 2.

---

## 2. Risk Assessment: Impact on Dependent Systems

Before modifying any query, we audited every dependent system to ensure no regressions:

| Dependent System | How It Queries Data | Risk / Conflict Level | Impact of Proposed Fix |
| :--- | :--- | :--- | :--- |
| **Penalty Background Worker** (`src/workers/penalty.worker.ts`) | Evaluates penalties per `ClassLog.coachProfileId` and `ClassJoinEvent`. | **Zero Risk** | The worker penalizes whoever held the session (`ClassLog.coachProfileId`), which is already Coach 2 for session 9. No change needed. |
| **Student Leaderboard Worker** (`src/workers/attendance-summary.worker.ts`) | Queries `AttendanceRecord` joined with `ClassLog.date` and `studentProfileId`. | **Zero Risk** | Does not check coach ID at all. Student attendance percentage is 100% unaffected. |
| **Syllabus / Assignment Release** (`src/actions/class-log-actions.ts`) | Creates `BatchAssignment` linked to `batch.id` and `classInstance.sessionNumber`. | **Zero Risk** | Assignments belong to the batch and syllabus level, not individual coaches. Unaffected. |
| **Student Dashboard & Join Class** (`src/app/student/page.tsx`) | Looks up `ClassInstance` by student enrollment (`BatchStudent`). | **Zero Risk** | Students always see their batch classes and meet link regardless of which coach teaches. |
| **Coach Reschedule Flow** (`src/app/api/admin/reschedule-requests/[id]/review/route.ts`) | Approving with `replacementCoachId` was updating `batch.coachProfileId`. | **Requires Safe Guard** | Must ensure temporary substitute does not permanently hijack the parent batch. |

---

## 3. Exact Step-by-Step Implementation Plan

### Step 1: Fix Admin Batch Payout Summary (`src/actions/payout-actions.ts`)
* **Problem:** `getAdminPayoutSummary` groups by `batchId` alone, overwriting the coach name with whichever log comes first.
* **Fix:** Group by a composite key `batchId + "_" + coachProfileId`.
* **Result:** If Coach 1 took 8 classes and Coach 2 took 1 class in `IND-GBR-1926`:
  - Row 1: `Core 2 bridge` | Coach 1 | 8 Sessions | ₹2,400
  - Row 2: `Core 2 bridge (Substitute)` | Coach 2 | 1 Session | ₹300
  Both coaches get accurate attribution and payouts.

### Step 2: Fix Admin Attendance Batch View (`src/app/admin/attendance/batch/[batchId]/page.tsx`)
* **Problem:** The header says "Coach: Coach 1" even if classes were taken by multiple coaches.
* **Fix:** Keep "Primary Coach: batch.coach.user.name" in the header, and add a visual badge "Substitute" on any row where `log.coachProfileId !== batch.coachProfileId`.
* **Result:** Clear audit trail showing Coach 1 as batch owner and Coach 2 as substitute for Lecture 9.

### Step 3: Prevent Overwrite in Reschedule Review API (`src/app/api/admin/reschedule-requests/[id]/review/route.ts`)
* **Problem:** Line 96-98 updates `batch: { update: { coachProfileId: replacementCoachId } }`.
* **Fix:** When reviewing a reschedule request, verify if the change is intended for the whole batch or only for this instance. When admin switches coach on the batch, ensure old completed `ClassLog` entries remain strictly bound to their historical coach.

### Step 4: Verification of Batch `IND-GBR-1926` Data
* Verify the `ClassLog` of Lecture 9 in `IND-GBR-1926`:
  - Check whether `coachProfileId` is currently Coach 1 or Coach 2.
  - Check whether `batch.coachProfileId` is currently Coach 1.
  - Ensure the attendance record has not been duplicated.

---

## 4. Safety & Rollback Guarantee
- **No Database Migration Required:** This solution does not alter existing database columns or drop tables.
- **Backward Compatible:** All past logs and financial totals remain intact.
- **Zero Downtime:** Changes are restricted to TypeScript server actions and page display queries.
