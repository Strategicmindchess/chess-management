# Strategic Mind Chess (SMC) — Referral & Rewards Program
## API Contracts & Server Action Specifications (Final Approved)

---

## 1. Overview

All referral transactions and administrative actions are executed through type-safe Server Actions under `src/actions/referral/` with Zod schema verification and strict role validation.

---

## 2. Student Server Actions

### 2.1 `getReferralDashboard()`
Retrieves the logged-in student's referral statistics, permanent referral code, shareable link, milestone progress, referral history, and claims.

* **Caller**: Student (`Role.STUDENT`)
* **Output**:
```typescript
interface ReferralDashboardResponse {
  referralCode: string; // e.g. "SMC-NAMAN25"
  shareableUrl: string; // e.g. "https://smc.academy/signup?ref=SMC-NAMAN25"
  stats: {
    totalInvited: number;
    registered: number;
    joinedSuccessfully: number;
    pendingVerification: number;
    totalEarnedCash: number;
    physicalGiftsClaimed: number;
  };
  currentMilestone: {
    id: string;
    title: string;
    requiredCount: number;
    currentQualifiedCount: number;
    progressPercentage: number;
    isUnlocked: boolean;
    hasPendingClaim: boolean;
    rewardType: 'CASH' | 'PHYSICAL_GIFT' | 'HYBRID';
    maxCashAmount: number;
    giftDescription?: string;
  };
  allMilestones: Array<{
    id: string;
    milestoneOrder: number;
    requiredReferrals: number;
    title: string;
    rewardType: 'CASH' | 'PHYSICAL_GIFT' | 'HYBRID';
    maxCashAmount: number;
    giftDescription?: string;
    isUnlocked: boolean;
    isClaimed: boolean;
  }>;
  referrals: Array<{
    id: string;
    candidateDisplayName: string; // Privacy masked: "Aarav S*****"
    candidateMaskedEmail: string; // "a***@gmail.com"
    status: 'PENDING' | 'REGISTERED' | 'JOINED_SUCCESSFULLY' | 'REWARD_APPROVED' | 'REWARD_DELIVERED' | 'DISQUALIFIED';
    registeredAt?: string;
    joinedAt?: string;
  }>;
  rewardClaims: Array<{
    id: string;
    milestoneTitle: string;
    rewardType: 'CASH' | 'PHYSICAL_GIFT' | 'HYBRID';
    approvedCashAmount?: number;
    giftItem?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'DISPATCHED' | 'DELIVERED';
    claimedAt: string;
    paymentReference?: string;
    deliveryCourier?: string;
    deliveryTrackingNumber?: string;
  }>;
  termsMarkdown: string;
}
```

---

### 2.2 `claimMilestoneReward(input: ClaimMilestoneInput)`
Called when a student reaches an unlocked milestone. Collects payout or shipping details.

* **Caller**: Student (`Role.STUDENT`)
* **Zod Input Schema**:
```typescript
const claimMilestoneSchema = z.object({
  milestoneId: z.string().cuid(),
  
  // For CASH or HYBRID rewards
  payoutUpiId: z.string().trim().regex(/^[\w.-]+@[\w.-]+$/, 'Invalid UPI ID').optional(),
  payoutBankDetails: z.object({
    accountNumber: z.string().min(8).max(20),
    ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code'),
    accountHolderName: z.string().min(2),
    bankName: z.string().min(2),
  }).optional(),
  
  // For PHYSICAL_GIFT or HYBRID rewards (Smartwatch delivery)
  shippingDetails: z.object({
    fullName: z.string().min(2),
    phone: z.string().min(10).max(15),
    addressLine: z.string().min(5),
    city: z.string().min(2),
    state: z.string().min(2),
    pincode: z.string().regex(/^\d{6}$/, 'Must be a 6-digit Indian PIN code'),
  }).optional(),
});
```
* **Output**:
```typescript
type ClaimMilestoneResponse = 
  | { success: true; claimId: string; status: 'PENDING' }
  | { success: false; error: string };
```

---

### 2.3 `validateReferralCode(code: string)`
Validates code existence, active status, and candidate eligibility.

* **Caller**: Public during `/signup`
* **Output**:
```typescript
type ValidateCodeResponse = 
  | { valid: true; referrerName: string; code: string }
  | { valid: false; error: string };
```

---

## 3. Super Admin Server Actions

### 3.1 `getAdminReferralOverview(params: FilterParams)`
Queries all referrals, attributions, and claims with search, pagination, and status filters.

---

### 3.2 `reviewRewardClaim(input: ReviewClaimInput)`
Approves or rejects a student reward claim, setting the final approved cash amount (up to ceiling).

* **Zod Schema**:
```typescript
const reviewClaimSchema = z.object({
  claimId: z.string().cuid(),
  action: z.enum(['APPROVE', 'REJECT']),
  approvedCashAmount: z.number().int().min(0).optional(),
  adminNotes: z.string().min(2).max(500),
  rejectionReason: z.string().min(5).max(500).optional(),
});
```

---

### 3.3 `markRewardDisbursed(input: MarkDisbursedInput)`
Marks cash rewards as paid (recording UTR) or physical gifts as dispatched/delivered (recording courier and tracking ID).

* **Zod Schema**:
```typescript
const markDisbursedSchema = z.object({
  claimId: z.string().cuid(),
  fulfilmentType: z.enum(['CASH', 'PHYSICAL_GIFT']),
  paymentReference: z.string().min(4).optional(), // UTR / IMPS ID
  deliveryCourier: z.string().optional(),          // Courier name
  deliveryTrackingNumber: z.string().optional(),   // Tracking / AWB
  isDelivered: z.boolean().default(false),
});
```

---

### 3.4 `updateMilestoneConfig(milestones: MilestoneConfigInput[])`
Updates milestone thresholds, cash ceilings, and gift details.

---

### 3.5 `exportReferralsCsv()`
Exports all referral activity and payouts for audit.
