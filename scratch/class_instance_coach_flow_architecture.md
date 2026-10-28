# Complete Flow & Architectural Blueprint: ClassInstance Coach Decoupling

**Document Type:** Technical Architecture & System Flow Specification  
**Status:** Under Review (Zero Code Changes Applied Yet)  
**Target Batches:** All Active Production Batches (e.g. `IND-GBR-1926`)  
**Timezone Context:** Host Server = US/UTC (Vercel) | Real Users = India (Asia/Kolkata, UTC +5:30)

---

## 1. Executive Summary

In Strategic Mind Chess CRM, **Batches** represent the permanent long-term cohort (e.g., *Core 2 Bridge*), while **ClassInstances** represent individual scheduled lectures (e.g., *Lecture 1*, *Lecture 2*, ..., *Lecture 9*).

### The Core Problem in Production Today
- Currently, individual `ClassInstance` records **do not store a coach ID**. They inherit the coach solely through `batch.coachProfileId`.
- When an individual lecture needs a substitute or replacement coach (e.g. Lecture 9 assigned to Coach 2), the system currently updates `batch.coachProfileId`.
- **Result:** Overwriting the batch coach reassigns the **entire cohort** to the substitute coach, corrupts the audit trail, collides in teacher dashboards, blocks attendance marking, and breaks monthly payout calculations.

### The Solution
1. **Decouple Coach Assignment:** Add `coachProfileId` directly to `ClassInstance`.
2. **"Update Coach" on Session Management:** In the Admin "Manage Sessions" modal, provide an **"Update Coach"** button for each lecture that updates **only that specific instance**.
3. **Strict Integrity:** The parent `Batch.coachProfileId` remains unchanged.
4. **Attendance & Payout Accuracy:** Attendance and payouts match the coach assigned to that specific instance and logged in `ClassLog`.

---

## 2. Timezone Synchronization Architecture (US Server vs. India IST)

Because the Next.js production server runs on Vercel (UTC / US servers), naive JavaScript `new Date()` or `setHours(0,0,0,0)` would cause a **5 hour 30 minute date drift**. 

All queries and background checks MUST strictly utilize `src/lib/timezone.ts`:

```mermaid
flowchart LR
    subgraph HostServer ["Vercel Host Server (UTC)"]
        UTC["Machine UTC Clock<br/>e.g. 2026-10-23 18:30:00Z"]
    end

    subgraph TimezoneLib ["src/lib/timezone.ts"]
        Bounds["getISTDayBounds()<br/>fromZonedTime('YYYY-MM-DD 00:00:00', 'Asia/Kolkata')"]
    end

    subgraph TargetIST ["India Real-World Calendar Date"]
        IST["Indian Midnight to Midnight<br/>2026-10-24 00:00:00 IST to 23:59:59 IST"]
    end

    UTC --> Bounds
    Bounds --> TargetIST
```

### Timezone Storage & Query Rules:
- **Database Storage:** `ClassInstance.date` is stored as normalized UTC timestamp representing Indian midnight (`T18:30:00.000Z` of the prior calendar day).
- **Time Strings:** `startTime` and `endTime` are stored as pure 24-hour strings (e.g. `"17:00"`, `"17:40"`).
- **Date Range Queries:** Queries must always use `date: { gte: today, lt: tomorrow }` where `today` and `tomorrow` come from `getISTDayBounds()`.

---

## 3. As-Is Flow: Current Production Architecture (The Buggy Flow)

Below is the exact flow executing in production today, illustrating why the collision occurs:

```mermaid
sequenceDiagram
    autonumber
    actor Coach1 as Coach 1 (Primary)
    actor Admin as Admin / Management
    actor Coach2 as Coach 2 (Substitute)
    participant BatchTable as DB: batches
    participant CITable as DB: class_instances
    participant LogTable as DB: class_logs
    participant PayoutAct as src/actions/payout-actions.ts

    Note over BatchTable: Batch IND-GBR-1926 created<br/>coachProfileId = Coach 1
    CITable->>BatchTable: Lecture 1 to 8 held & logged by Coach 1

    Note over Coach1,CITable: --- Reschedule Incident on Lecture 9 ---
    Coach1->>Admin: Submits reschedule request for Lecture 9
    Admin->>CITable: Approves with replacementCoachId = Coach 2
    Note over CITable,BatchTable: 💥 BUG: ClassInstance has NO coach field!<br/>review/route.ts updates batch.coachProfileId = Coach 2
    BatchTable-->>BatchTable: Batch Coach OVERWRITTEN to Coach 2!

    Note over Coach2,LogTable: --- Lecture 9 Conducted ---
    Coach2->>LogTable: Marks Lecture 9 Held -> ClassLog saved (coach = Coach 2)
    CITable-->>CITable: Lecture 9 marked COMPLETED

    Note over Admin,BatchTable: --- Manual Patch ---
    Admin->>BatchTable: Re-assigns Coach 1 as Batch Coach

    Note over PayoutAct: --- End of Month Payout Run ---
    PayoutAct->>LogTable: Fetches all ClassLogs for IND-GBR-1926
    Note over PayoutAct: Grouping Key: log.batchId ONLY!<br/>If Lecture 9 (Coach 2) is read first:<br/>ALL 9 SESSIONS show under Coach 2's name!<br/>Coach 1 appears with 0 sessions!
```

---

## 4. To-Be Flow: Decoupled Target Architecture

In the new architecture, **Batch Ownership** and **Class Execution** are cleanly separated.

### Entity Relationship Model:

```mermaid
erDiagram
    BATCH ||--o{ CLASS_INSTANCE : "schedules (1-to-many)"
    COACH_PROFILE ||--o{ BATCH : "owns default cohort"
    COACH_PROFILE ||--o{ CLASS_INSTANCE : "assigned to teach (1-to-many)"
    CLASS_INSTANCE ||--o| CLASS_LOG : "generates upon completion (1-to-1)"
    COACH_PROFILE ||--o{ CLASS_LOG : "conducted by (1-to-many)"

    BATCH {
        string id PK
        string code "e.g. IND-GBR-1926"
        string coachProfileId FK "Default primary coach"
        int payoutRate "Default per session rate"
    }

    CLASS_INSTANCE {
        string id PK
        string batchId FK
        string coachProfileId FK "Assigned coach for THIS lecture"
        datetime date "IST Normalized Midnight"
        string startTime "17:00"
        string endTime "17:40"
        enum status "SCHEDULED | COMPLETED | CANCELLED"
        string classLogId FK "Nullable"
    }

    CLASS_LOG {
        string id PK
        string batchId FK
        string coachProfileId FK "Actual coach who held class"
        datetime date
        string topicCovered
        int payoutAmount
    }
```

---

## 5. End-to-End System Workflows (To-Be State)

### Workflow A: Batch Creation & Class Generation
When a new batch or recurring future instances are generated, each instance inherits the default batch coach.

```mermaid
flowchart TD
    Start[Admin creates Batch IND-GBR-1926] --> AssignCoach[Assigns Primary Coach: Coach 1]
    AssignCoach --> GenInstances[instance-generator.ts runs]
    GenInstances --> Loop[Loop each scheduled calendar slot]
    Loop --> CreateCI["Create ClassInstance:<br/>• batchId = IND-GBR-1926<br/>• coachProfileId = Coach 1 (Inherited)<br/>• date = IST Normalized Date<br/>• status = SCHEDULED"]
    CreateCI --> SaveDB[(PostgreSQL Database)]
```

---

### Workflow B: Admin "Update Coach" on Manage Sessions Dialog
This is the new feature requested. Admin can change the coach for any individual lecture without touching the parent batch.

```mermaid
flowchart TD
    Admin[Admin opens Manage Sessions Dialog] --> ViewList[List of Sessions for IND-GBR-1926]
    ViewList --> SelectRow[Selects Lecture 9: Currently Coach 1]
    SelectRow --> ClickBtn["Clicks new 'Update Coach' button"]
    ClickBtn --> OpenModal[Modal opens with Coach Dropdown]
    OpenModal --> PickCoach[Admin selects Coach 2]
    PickCoach --> CallAction["Server Action: updateClassInstanceCoach({ instanceId, coach2Id })"]
    CallAction --> ExecQuery["prisma.classInstance.update({<br/>where: { id: lecture9Id },<br/>data: { coachProfileId: coach2Id }<br/>})"]
    ExecQuery --> Verify["Batch IND-GBR-1926 coachProfileId remains Coach 1 ✅<br/>Only Lecture 9 has coachProfileId = Coach 2 ✅"]
```

---

### Workflow C: Teacher Dashboard & Today's Attendance Load
Fast, indexed database query using India calendar boundaries:

```mermaid
flowchart TD
    CoachLogin[Coach logs into Portal] --> CheckRole[Role: TEACHER]
    CheckRole --> GetTime["getISTDayBounds() fetches [todayStart, tomorrowStart)"]
    GetTime --> RunQuery["prisma.classInstance.findMany({<br/>where: {<br/>  coachProfileId: coach.id,<br/>  date: { gte: today, lt: tomorrow },<br/>  status: 'SCHEDULED'<br/>}<br/>})"]
    RunQuery --> FilterFast["Fast Index Scan on (coachProfileId, date)"]
    FilterFast --> RenderUI["Displays Today's Classes with Live Meet Join Button"]
```

---

### Workflow D: Attendance Marking & ClassLog Locking
The coach who takes the class marks attendance and becomes the immutable historical coach:

```mermaid
flowchart TD
    ClassEnd[Lecture 9 ends] --> CoachAction[Coach 2 clicks 'Mark Class Held']
    CoachAction --> VerifyPerm["Validation: classInstance.coachProfileId == Coach 2?<br/>(Passed ✅)"]
    VerifyPerm --> SubmitForm[Coach 2 fills topic & marks attendance]
    SubmitForm --> TxStart[Atomic Prisma Transaction]
    
    subgraph Transaction ["Atomic Database Write"]
        Tx1["Create ClassLog:<br/>• batchId = IND-GBR-1926<br/>• coachProfileId = Coach 2<br/>• payoutAmount = ₹300"]
        Tx2["Update ClassInstance:<br/>• status = COMPLETED<br/>• classLogId = ClassLog.id<br/>• coachProfileId = Coach 2"]
        Tx3["Create AttendanceRecord rows for students"]
    end
    
    TxStart --> Tx1 --> Tx2 --> Tx3 --> TxEnd[Transaction Committed]
    TxEnd --> Success[Attendance Locked & Official Record Established]
```

---

### Workflow E: Monthly Coach Payout Aggregation
Payout summary resolves the collision by aggregating per `batchId + "_" + coachProfileId`:

```mermaid
flowchart TD
    MonthSelect[Admin selects Month: e.g. October 2026] --> FetchLogs["Fetch all ClassLogs within IST Month Boundaries"]
    FetchLogs --> AggregateLoop["Loop Logs and Key by (batchId + '_' + coachProfileId)"]
    
    AggregateLoop --> Group1["Group 1: IND-GBR-1926 + Coach 1<br/>• 8 Sessions Held<br/>• Total Due: ₹2,400"]
    AggregateLoop --> Group2["Group 2: IND-GBR-1926 (Substitute) + Coach 2<br/>• 1 Session Held<br/>• Total Due: ₹300"]
    
    Group1 --> OutputSummary[Accurate Payout Table]
    Group2 --> OutputSummary
    OutputSummary --> SafePayout[Both Coaches Paid Correctly with Zero Overwrite]
```

---

## 6. Database Backfill Script Logic (`src/scripts/backfill-class-instance-coaches.ts`)

To ensure zero downtime and zero broken records on the 6–7 live batches, the backfill script executes the following deterministic reconciliation:

```mermaid
flowchart TD
    Start[Fetch all ClassInstances from DB] --> Loop[Iterate each ClassInstance]
    Loop --> CheckLog{Does this instance have a ClassLog?}
    
    CheckLog -- Yes --> UseLogCoach["targetCoachId = classLog.coachProfileId<br/>(Historical teacher who held the class)"]
    
    CheckLog -- No --> CheckReschedule{Is there an approved reschedule request with replacement coach?}
    
    CheckReschedule -- Yes --> UseReplacement["targetCoachId = rescheduleRequest.replacementCoachId"]
    
    CheckReschedule -- No --> CheckBatch{Does parent batch have a coach?}
    
    CheckBatch -- Yes --> UseBatchCoach["targetCoachId = batch.coachProfileId"]
    CheckBatch -- No --> SetNull["targetCoachId = null"]
    
    UseLogCoach --> Compare{instance.coachProfileId == targetCoachId?}
    UseReplacement --> Compare
    UseBatchCoach --> Compare
    SetNull --> Compare
    
    Compare -- No --> UpdateDB["prisma.classInstance.update({<br/>where: { id: instance.id },<br/>data: { coachProfileId: targetCoachId }<br/>})"]
    Compare -- Yes --> Skip[No update needed]
    
    UpdateDB --> Next[Process next instance]
    Skip --> Next
    Next --> SummaryReport[Print Migration Summary & Audit IND-GBR-1926]
```

---

## 7. Safety & Backward Compatibility Guarantee

1. **Non-Destructive Schema Change:**
   - Adding `coachProfileId` to `class_instances` as nullable/optional does not drop any tables or lock rows.
2. **Fallback Queries:**
   - Any query in application code will use:
     `coachId = classInstance.coachProfileId || classInstance.batch.coachProfileId`
     This ensures that during deployment, not a single page or API throws an error.
3. **No Batch Overwrites:**
   - Updating a class instance never touches `Batch.coachProfileId`.
