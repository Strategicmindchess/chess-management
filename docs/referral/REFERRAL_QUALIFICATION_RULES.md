# Strategic Mind Chess (SMC) — Referral & Rewards Program
## Qualification, Verification & Anti-Fraud Policy (Final Approved)

---

## 1. Referral Qualification Criteria

For a referral to transition from `REGISTERED` to `JOINED_SUCCESSFULLY` and count towards reward milestones, the referred student must satisfy **both** of the following requirements:

1. **Payment Verification**:
   * The student's first fee cycle (`FeeCycle`) must be marked with status **`PAID`** by Super Admin or management.
2. **Batch Enrollment**:
   * The student must be actively assigned and enrolled in an SMC coaching batch (`BatchStudent` relation exists with `Batch.isActive === true`).

Once both criteria are met, the background event handler or admin trigger automatically updates the referral status to **`JOINED_SUCCESSFULLY`**, stamps `qualifiedAt = now()`, and increments the referrer's qualified counter.

---

## 2. Refund, Cancellation & Disqualification Policy

If a referred student cancels their enrollment or receives a fee refund within the initial 14–30 days:
1. **Status Transition**: The attribution status transitions to **`DISQUALIFIED`**.
2. **Milestone Re-calculation**: The system deducts **1** from the referrer's qualified count.
3. **Claim Impact**:
   * Any **`PENDING`** reward claim submitted by the referrer that depended on this referral is automatically frozen and marked `REVOKED`.
   * An audit log entry is written detailing the cancellation/refund event.
4. **Historical Record**: The historical record is preserved for auditing; no records are physically deleted from the database.

---

## 3. Anti-Fraud & Self-Referral Prevention

### Rule 1: Self-Referral Prevention
* A student cannot enter their own referral code.
* A student cannot refer an account with the same email, mobile phone, or parent phone number:
  $$\text{Candidate}(\text{phone}, \text{parentPhone}, \text{email}) \cap \text{Referrer}(\text{phone}, \text{parentPhone}, \text{email}) = \emptyset$$

### Rule 2: Single Attribution Lock
* A new student can be attributed to at most one referrer for the lifetime of their account.
* Referral code attribution is locked at registration and cannot be modified post-signup.

### Rule 3: Velocity & Abuse Detection
* If more than 5 signups originate from the same IP address or device fingerprint within 24 hours, subsequent referrals are placed in `PENDING_REVIEW` before qualification.

---

## 4. Cumulative Milestone Progression & Ceiling Rules

* **Milestone 1**: 1 Referred Student $\rightarrow$ Cash reward up to ₹500 (Bank Transfer / UPI)
* **Milestone 2**: 3 Referred Students $\rightarrow$ Smartwatch worth up to ₹2,500 (Physical Courier)
* **Milestone 3**: 5 Referred Students $\rightarrow$ Smartwatch + Cash reward up to ₹5,000 (Physical Courier + Bank Transfer)

### Progression Behavior:
* Rewards are **Cumulative**. A student referring 5 students receives Tier 1, Tier 2, *and* Tier 3 rewards progressively.
* The "up to" ceiling gives Super Admin discretionary authority to approve the final amount based on course package duration and campaign guidelines.
