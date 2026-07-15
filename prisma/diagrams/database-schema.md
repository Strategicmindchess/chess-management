# Database Schema & ER Diagram

This document contains the Entity-Relationship (ER) diagram for the SMC CRM and a detailed breakdown of how data is stored in the database.

## ER Diagram

```mermaid
erDiagram
    users {
        String id PK
        String name
        String email UK
        String passwordHash
        Boolean emailVerified
        String googleId UK
        Role role "ADMIN, TEACHER, STUDENT"
        String phone
        Boolean isActive
        DateTime createdAt
        DateTime updatedAt
    }

    student_profiles {
        String id PK
        String userId FK, UK
        String parentName
        String parentPhone
        String city
        String chessComId
        String lichessId
        Int rating
        DateTime joiningDate
        Int monthlyFee
        Int perSessionFee
        String assignedCoachId FK
        DateTime createdAt
        DateTime updatedAt
    }

    coach_profiles {
        String id PK
        String userId FK, UK
        String bio
        String experience
        String city
        DateTime createdAt
        DateTime updatedAt
    }

    coach_rates {
        String id PK
        String coachId FK, UK
        Int groupSessionRate
        Int privateRate
        DateTime createdAt
        DateTime updatedAt
    }

    otp_codes {
        String id PK
        String userId FK
        OtpPurpose purpose "SIGNUP_VERIFICATION, PASSWORD_RESET"
        String codeHash
        Int attempts
        DateTime consumedAt
        DateTime expiresAt
        DateTime createdAt
    }

    refresh_tokens {
        String id PK
        String userId FK
        String tokenHash UK
        DateTime expiresAt
        DateTime revokedAt
        DateTime createdAt
    }

    batches {
        String id PK
        String name
        String code UK
        String meetLink
        DateTime startDate
        Boolean isActive
        DateTime createdAt
        DateTime updatedAt
        Int payoutRate
        String coachId FK
    }

    batch_schedules {
        String id PK
        String batchId FK
        Weekday day
        String startTime
        String endTime
    }

    batch_students {
        String id PK
        String batchId FK
        String studentId FK
        DateTime joinedAt
    }

    coach_availability {
        String id PK
        String coachId FK
        DateTime date
        String startTime
        String endTime
        DateTime createdAt
        DateTime updatedAt
    }

    class_logs {
        String id PK
        String batchId FK
        String coachId FK
        DateTime date
        String topicCovered
        Int durationMins
        Int payoutAmount
        DateTime createdAt
        DateTime updatedAt
    }

    attendance_records {
        String id PK
        String classLogId FK
        String studentId FK
        AttendanceStatus status "PRESENT, ABSENT"
    }

    users ||--o| student_profiles : "extends (STUDENT)"
    users ||--o| coach_profiles : "extends (TEACHER)"
    coach_profiles ||--o| coach_rates : "has"
    users ||--o{ otp_codes : "requests"
    users ||--o{ refresh_tokens : "authenticates with"
    users ||--o{ batches : "coaches"
    batches ||--o{ batch_schedules : "meets at"
    batches ||--o{ batch_students : "has enrolled"
    users ||--o{ batch_students : "enrolls in"
    coach_profiles ||--o{ coach_availability : "declares"
    coach_profiles ||--o{ student_profiles : "mentors"
    batches ||--o{ class_logs : "records"
    users ||--o{ class_logs : "logs (TEACHER)"
    class_logs ||--o{ attendance_records : "tracks"
    users ||--o{ attendance_records : "attends (STUDENT)"
```

## Tables & Data Storage Details

### Core & Auth
1. **users**: The central table for authentication and identity. Stores credentials, role (`ADMIN`, `TEACHER`, `STUDENT`), and basic contact info. 
2. **otp_codes**: Stores one-time passwords (hashed) for email verification and password resets. Includes expiration time and attempt counts to prevent brute-forcing.
3. **refresh_tokens**: Stores hashed long-lived tokens allowing users to stay logged in securely without storing permanent session cookies.

### Profiles
4. **student_profiles**: Extends the `users` table for students. Stores parent info, chess ratings, Lichess/Chess.com IDs, and fee details. Linked 1-to-1 with a User.
5. **coach_profiles**: Extends the `users` table for coaches. Stores their bio, experience, and city.
6. **coach_rates**: Stores payout rates for coaches (group vs private sessions). Linked 1-to-1 with a CoachProfile.

### Scheduling & Batches
7. **batches**: Represents a recurring class. Stores the permanent Google Meet link, batch code, active status, and the assigned coach.
8. **batch_schedules**: Stores the weekly recurring schedule for a batch (e.g., Every MONDAY at 16:00). A batch can have multiple schedules.
9. **batch_students**: A join table mapping which students are enrolled in which batches.
10. **coach_availability**: Stores specific time slots when a coach has declared they are available to take new classes or demos.

### Logs & Attendance
11. **class_logs**: Created by a coach after a session. Acts as the official record of a class taking place, storing the topic covered, duration, and the payout amount locked in at that time.
12. **attendance_records**: Linked to a `class_log`. Stores the presence (`PRESENT` / `ABSENT`) of each student for that specific session.
