# Strategic Mind Chess (SMC) — Referral & Rewards Program
## Master Execution Plan & Implementation Roadmap (Final Approved)

---

## 1. Execution Roadmap Overview

The implementation is structured into 6 sequential, test-driven phases:

| Phase | Milestone | Scope | Priority |
| :---: | :--- | :--- | :---: |
| **Phase 1** | **Database & Data Modeling** | `prisma/schema/referral.prisma`, migrations, seeds | P0 |
| **Phase 2** | **Core Backend Services & Actions** | Code generation (`SMC-NAMAN25`), attribution, qualification | P0 |
| **Phase 3** | **Student Moving Announcement Strip** | Marquee strip `#A94D0B` on Student/Parent dashboard | P1 |
| **Phase 4** | **Registration Flow & Code Attribution** | `/signup?ref=...` capture, prefill, OTP verification link | P1 |
| **Phase 5** | **Student "Earn with SMC" Portal** | `/student/earn`, progress bar, masked table, Claim Modal | P1 |
| **Phase 6** | **Super Admin Management & Audits** | `/admin/referrals`, approvals, UTR & courier tracking, CSV | P1 |

---

## 2. Phase-by-Phase Task Breakdown

### Phase 1: Database & Data Modeling
1. Create `prisma/schema/referral.prisma` with models:
   - `ReferralCode`
   - `ReferralAttribution`
   - `RewardMilestone`
   - `RewardClaim`
   - `RewardClaimItem`
   - `ReferralAuditLog`
   - `ReferralConfig`
2. Update `prisma/schema/user.prisma` with relations to `ReferralCode`, `ReferralAttribution`, `RewardClaim`.
3. Generate Prisma client (`npm run db:generate`).
4. Create seed script `scripts/seed-referral-milestones.ts` to populate default milestones (1, 3, 5 students).

### Phase 2: Core Domain Services & Server Actions
1. `src/services/referral/referral-code.service.ts`:
   - Auto-generate uppercase `SMC-<FIRSTNAME><2-DIGIT-RANDOM>` (e.g. `SMC-NAMAN25`).
2. `src/services/referral/attribution.service.ts`:
   - Self-referral validation, anti-duplicate attribution, IP telemetry logging.
3. `src/services/referral/qualification.service.ts`:
   - Automated check: 1st Fee Cycle marked `PAID` + Student enrolled in active `Batch`.
   - Transition status to `JOINED_SUCCESSFULLY`.
4. `src/services/referral/milestone.service.ts`:
   - Cumulative milestone calculation, progress percentage, unlock logic.
5. `src/services/referral/referral-audit.service.ts`:
   - Immutable audit logging for status changes, approvals, disbursements.

### Phase 3: Moving Announcement Strip (Student Dashboard)
1. Build `src/components/referral/announcement-strip.tsx`:
   - Background `#A94D0B` (Dark Saffron), bold white text.
   - Smooth seamless infinite marquee animation with pause on hover/focus.
   - Reduced-motion accessibility check (`motion-reduce:animate-none`).
   - Copy: `🎁 EARN WITH SMC | Refer 1 Chessmate – Get up to ₹500 cash reward | Refer 3 Chessmates – Get a smartwatch worth up to ₹2,500 | Refer 5 Chessmates – Get a smartwatch + cash reward up to ₹5,000.`
   - "Earn with SMC" button linking directly to `/student/earn`.
2. Integrate into `src/components/layout/dashboard-shell.tsx`:
   - Render strip conditionally when `role === Role.STUDENT`.

### Phase 4: Registration Flow & Code Capture
1. Update `src/components/auth/signup-flow.tsx` & `signup-details-form.tsx`:
   - Read URL search param `?ref=...` and prefill referral code field.
   - Provide referral code input field with live validation.
2. Update `src/actions/auth/signup.ts`:
   - Accept `referralCode` in input; validate code and prevent self-referral.
   - Stage attribution record.
3. Update `src/actions/auth/verify-signup-otp.ts`:
   - Finalize attribution: set `referredUserId = user.id`, update status to `REGISTERED`.

### Phase 5: Student "Earn with SMC" Portal (`/student/earn`)
1. Create route `src/app/student/earn/page.tsx`.
2. Build UI components under `src/components/referral/`:
   - `ReferralHeroCard.tsx`: Code display, Copy Code, Copy Link, Web Share / WhatsApp buttons.
   - `ReferralStatsCards.tsx`: 4 high-contrast KPI cards (Total Invited, Joined, Pending, Total Earned).
   - `MilestoneProgressTracker.tsx`: Animated multi-tier progress bar (1 $\rightarrow$ 3 $\rightarrow$ 5).
   - `ClaimRewardModal.tsx`: Captures UPI ID / Bank Details for cash, or Full Shipping Address for smartwatch.
   - `ReferralActivityTable.tsx`: Privacy-masked names (`Aarav S*****`), dates, status badges.
   - `RewardClaimsTable.tsx`: Claim history, approved cash amount, smartwatch tracking number.
   - `ProgramTermsModal.tsx`: Official program rules and FAQ.
3. Add "Earn with SMC" to student navigation in `src/components/layout/nav-config.ts`.

### Phase 6: Super Admin Management Hub (`/admin/referrals`)
1. Create route `src/app/admin/referrals/page.tsx`.
2. Build Admin components under `src/components/admin/referrals/`:
   - `AdminReferralTable.tsx`: Searchable list of referrals, filters by status.
   - `ClaimReviewModal.tsx`: Review claim, adjust approved cash amount (up to ceiling), approve/reject with notes.
   - `DisbursementModal.tsx`: Mark cash paid (record UTR), mark smartwatch dispatched (record courier & tracking ID).
   - `MilestoneSettingsDrawer.tsx`: Super Admin configuration of milestones and values.
   - `ExportReferralReport.tsx`: Export CSV report.
3. Add "Referral Management" to admin navigation in `src/components/layout/nav-config.ts`.
