# SMC CRM — Chess Academy Management System

A full-stack Next.js application for Strategic Mind Chess. This covers **Auth** (with
self-signup, email OTP verification, Google sign-in, JWT access/refresh tokens, forgot/reset/
change password) and the core **Admin** module (create batches, assign coaches, enroll
students). Remaining modules from the brief will be built incrementally on top of this
foundation.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Components, Server Actions) |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma 7 (driver adapter: `@prisma/adapter-pg`) |
| Auth | Custom access + refresh JWT/opaque tokens (`jose`), following the stateless-session pattern from the Next.js 16 auth guide |
| Email | `nodemailer` (SMTP), used for signup/reset OTP codes |
| OAuth | Hand-rolled Google OAuth 2.0 / OIDC code flow (no SDK) |
| Styling | Tailwind CSS v4 |
| Forms | `react-hook-form` + `zod` |

There is no separate "backend" project — API/business logic lives in Next.js **Server Actions**
(`src/actions/*`), a couple of **Route Handlers** for the Google OAuth redirect flow
(`src/app/api/auth/google/*`, which can't be a Server Action since OAuth needs real GET
redirects), and Server Components that query the database directly through Prisma. This *is*
the backend; it just runs inside the Next.js server runtime.

> **Note on the framework version:** this project pins a very recent Next.js 16 / Prisma 7
> release with real breaking changes vs. older tutorials (e.g. `middleware.ts` → `proxy.ts`,
> async `params`/`cookies()`, Prisma's schema no longer holding the DB `url`, driver adapters
> instead of the old implicit connection). See `AGENTS.md` if you extend this project with an
> AI agent — it points at the bundled docs in `node_modules/next/dist/docs`.

## How authentication works

**Tokens.** Every session is a pair of cookies, both `httpOnly`:
- **Access token** — a short-lived (15 min) signed JWT (`jose`), verified with no DB call.
- **Refresh token** — a long-lived (30 days) random opaque string. Only its SHA-256 hash is
  stored, in the `refresh_tokens` table, so it can be revoked (logout, password change/reset).

`src/proxy.ts` (the Next 16 replacement for `middleware.ts`) checks the access token on every
request. If it's expired but the refresh token is still valid, proxy silently mints a new access
token and the user never notices — this is the "auto sign-in from a saved refresh token" behavior.
The authoritative check lives in `src/lib/dal.ts` (`verifySession`/`getCurrentUser`/`requireRole`),
called from every protected Server Component/Action, per the Next.js Data Access Layer pattern.

**Signup (Student self-service only).** Coaches and Admins are *never* self-registered — an Admin
creates those accounts from `/admin/users` with an emailVerified account and a password of the
Admin's choosing. The public `/signup` page only ever creates `STUDENT` accounts:
1. Name + email + password (or "Continue with Google").
2. A 6-digit code is emailed (`prisma.otpCode`, hashed, 10 min expiry, 5 attempts, 60s resend
   cooldown).
3. Entering the correct code verifies the email, logs the user in, and lands on `/student`.

**Google sign-in.** `/api/auth/google` redirects to Google's consent screen with a CSRF `state`
cookie; `/api/auth/google/callback` verifies the returned ID token against Google's public keys
(no `googleapis` SDK), then finds-or-creates a user by email (new accounts are always Students;
if the email matches an existing Admin/Coach account it just links Google as an extra sign-in
method for that account) and starts a session.

**Forgot / reset / change password.** `/forgot-password` emails a reset OTP (same OTP
infrastructure, different `purpose`) without revealing whether the email exists.
`/reset-password` verifies the code, sets the new password, and — like `/account/change-password`
for already-logged-in users — revokes every other refresh token for that account (signs the user
out on other devices) while keeping the current device signed in.

## Project structure

```
prisma/
  schema.prisma           User, Batch, BatchSchedule, BatchStudent, OtpCode, RefreshToken
  seed.ts                  Creates the admin account + demo coach/student/batch
prisma.config.ts           Prisma CLI config (schema path, migrations, seed command)
src/
  proxy.ts                 Optimistic access/refresh token check (replaces "middleware")
  lib/
    enums.ts               Bundler-safe Role/Weekday enums (used everywhere except Prisma calls)
    prisma.ts              Prisma Client singleton (pg driver adapter)
    dal.ts                 Data Access Layer — verifySession / getCurrentUser / requireRole
    password.ts             bcrypt hash/verify
    validation/             Zod schemas shared by client forms and Server Actions
  services/                 Business logic, one concern per file (no page/action goes over Prisma directly for auth)
    auth/
      access-token.ts        Sign/verify the short-lived JWT
      refresh-token.ts        Issue/verify/revoke the long-lived DB-backed token
      cookie-options.ts       Shared cookie flags for both cookies
      session.ts              start/end a session, resolve identity from raw cookie values
      otp.ts                  Issue/verify/resend-cooldown for email OTP codes
      google-oauth.ts         Build the consent URL, exchange code, verify Google's ID token
    email/
      mailer.ts               SMTP sender (falls back to console logging if unconfigured)
      otp-email.ts            OTP email templates/senders
  actions/                  Server Actions ("use server") — one file per action
    auth/
      signup.ts, verify-signup-otp.ts, resend-signup-otp.ts,
      login.ts, logout.ts,
      forgot-password.ts, reset-password.ts, change-password.ts
    user-actions.ts          Admin: create coach/student accounts, activate/deactivate
    batch-actions.ts         Admin: create batch, assign coach, enroll/unenroll students
  app/
    api/auth/google/         Route Handlers for the Google OAuth redirect + callback
    login/, signup/, forgot-password/, reset-password/   Public auth pages
    account/change-password/ Authenticated, role-agnostic settings page
    admin/                   Admin dashboard, Users (coaches/students), Batches
    teacher/                  Coach dashboard (read-only view of assigned batches for now)
    student/                  Student dashboard (read-only view of enrolled batches for now)
  components/
    ui/                     Small hand-rolled design system (Button, Input, Dialog, Table, ...)
    layout/                 Sidebar / Topbar / DashboardShell + per-role nav config
    auth/                   AuthLayout, GoogleButton, OtpInput, and one form per auth page
    admin/                  Admin-only dialogs and tables
```

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in real values:

```bash
cp .env.example .env
```

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Long random string used to sign access-token JWTs (`openssl rand -base64 32`) |
| `APP_URL` | Base URL of the app; used to build the Google redirect URI and email links |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Used once by `prisma/seed.ts` to create the first Super Admin |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `EMAIL_FROM` | SMTP creds for OTP emails. **Optional** — if unset, OTP codes are printed to the server console instead, so the app is fully testable without email set up. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | From the [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Authorized redirect URI must be `{APP_URL}/api/auth/google/callback`. **Optional** — if unset, the "Continue with Google" button shows a friendly error instead of crashing. |

### 3. Set up the database

```bash
npm run db:migrate   # creates tables from prisma/schema.prisma
npm run db:seed      # creates the admin account + a demo coach/student/batch
```

### 4. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000` — you'll be redirected to `/login`. Try `/signup` to see the
Student self-registration + email OTP flow (watch the terminal for the code if SMTP isn't
configured yet).

### Demo accounts (created by `npm run db:seed`)

| Role | Email | Password |
| --- | --- | --- |
| Admin | value of `ADMIN_EMAIL` in `.env` | value of `ADMIN_PASSWORD` in `.env` |
| Coach | `coach.demo@strategicmindchess.com` | `Coach@123` |
| Student | `student.demo@strategicmindchess.com` | `Student@123` |

The seed also creates a demo batch (`DEMO-01`) with the coach assigned and the student enrolled,
so you can log in as any of the three roles and immediately see real data.

## What's implemented

- **Auth module** — Student self-signup with email OTP verification, Google sign-in, login,
  logout, forgot/reset password, change password, JWT access token + DB-backed refresh token
  with silent renewal, role-based route protection enforced both optimistically in `src/proxy.ts`
  and authoritatively via `requireRole()`/`getCurrentUser()` in `src/lib/dal.ts`.
- **Admin module**
  - Create Coach / Student accounts (pre-verified, Admin sets the password), activate/deactivate.
  - Create batches with a name, code, Google Meet link, and a weekly recurring schedule.
  - Assign or change a batch's coach.
  - Enroll/unenroll students in a batch.
- Coach and Student dashboards showing their assigned/enrolled batches, so the full
  signup/login → create → assign → enroll flow can be verified end-to-end from all three roles.

## What's next

The brief defines 13 modules; Auth and the core of the Admin module (batches/coaches) are built.
Planned next, one at a time: Join Class, Cancellation/Rescheduling, Coach Attendance & Class Log,
Coach Payout Automation, Coach Availability, full Student Management, Fee Tracking, Student
Feedback, Ticket Management, Syllabus & Resources, Coach Performance Evaluation, and richer
role-specific dashboards.

### Open questions for the co-founders (carried over from the brief)

- Should the monthly feedback form go out automatically or be triggered by management?
- Notification method for other modules (email only, or something else)?
- Who uploads session recordings, and where do they live (Drive link vs. direct upload)?
- Confirm no payment gateway is needed in Phase 1 (fee status stays manual).
- Any hosting preference, or is that left to the developer?

## Useful scripts

```bash
npm run dev          # start the dev server
npm run build        # production build
npm run lint         # eslint
npm run db:migrate   # prisma migrate dev
npm run db:push      # prisma db push (no migration history)
npm run db:seed      # run prisma/seed.ts
npm run db:studio    # open Prisma Studio
npm run db:reset     # drop + recreate the database from migrations
```
