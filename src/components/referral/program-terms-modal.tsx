'use client';

import { X, ShieldCheck, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProgramTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customTerms?: string | null;
}

export function ProgramTermsModal({ isOpen, onClose, customTerms }: ProgramTermsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#181c26]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-[#A94D0B] dark:bg-amber-950/60 dark:text-amber-400">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Program Terms & Conditions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Strategic Mind Chess (SMC) Referral & Rewards Policy
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {customTerms ? (
            <div className="whitespace-pre-line">{customTerms}</div>
          ) : (
            <>
              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  1. Eligibility & Milestone Progression
                </h3>
                <p>
                  The &quot;Earn with SMC&quot; program is open to enrolled Students and Parents of Strategic Mind Chess.
                  Rewards are cumulative and unlock sequentially based on the count of successfully qualified referrals:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>1 Chessmate</strong>: Cash reward up to ₹500 via Bank Transfer or UPI.</li>
                  <li><strong>3 Chessmates</strong>: Physical smartwatch worth up to ₹2,500 delivered via courier.</li>
                  <li><strong>5 Chessmates</strong>: Smartwatch + cash reward up to ₹5,000.</li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white">
                  2. Qualification Requirements
                </h3>
                <p>
                  A referral is counted toward a milestone only after the referred student completes verified registration, is assigned to an active coaching batch, and has their first monthly/batch fee cycle marked as <strong>PAID</strong>.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white">
                  3. &quot;Up to&quot; Discretionary Value Disclosure
                </h3>
                <p>
                  Reward values are stated as &quot;up to&quot; ceilings. Final approved cash reward figures and smartwatch models are determined and verified by Super Admin according to the course package duration and campaign guidelines active at the time of claim.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white">
                  4. Anti-Fraud & Self-Referral Guardrails
                </h3>
                <p>
                  Self-referrals (referring one&apos;s own email, phone number, or immediate household account) are strictly prohibited and filtered automatically by the system. Each new student may be attributed to only one referrer in their account lifetime.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white">
                  5. Refunds, Cancellations & Disqualification
                </h3>
                <p>
                  In the event of a fee refund, cancellation, or chargeback within the initial 14–30 day onboarding period, the referral will be marked as Disqualified, deducted from the qualified milestone counter, and any pending unfulfilled claim will be frozen or revoked.
                </p>
              </section>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
          <Button onClick={onClose} variant="secondary" size="sm">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

