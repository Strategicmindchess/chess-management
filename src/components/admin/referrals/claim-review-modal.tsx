'use client';

import { useState } from 'react';
import { X, CheckCircle2, XCircle, AlertCircle, Loader2, IndianRupee, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { reviewRewardClaim } from '@/actions/referral/admin-referrals';

interface ClaimReviewModalProps {
  claim: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ClaimReviewModal({ claim, isOpen, onClose, onSuccess }: ClaimReviewModalProps) {
  const [action, setAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [approvedCash, setApprovedCash] = useState<number>(claim?.maxCashAmount || 0);
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !claim) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await reviewRewardClaim({
        claimId: claim.id,
        action,
        approvedCashAmount: action === 'APPROVE' && claim.maxCashAmount > 0 ? approvedCash : undefined,
        approvalNotes: notes || undefined,
        rejectionReason: action === 'REJECT' ? rejectionReason : undefined,
      });

      if (!res.success) {
        setError(res.error || 'Failed to update claim.');
        setIsSubmitting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Server error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#181c26]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Review Claim: {claim.milestoneTitle}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Submitted by: <strong>{claim.user?.name}</strong> ({claim.user?.email})
        </p>

        {error && (
          <div className="mt-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {/* Claim Summary Box */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-900/50 space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">Reward Type:</span>
            <span className="font-bold">{claim.rewardType}</span>
          </div>
          {claim.payoutUpiId && (
            <div className="flex justify-between">
              <span className="text-slate-500">UPI ID:</span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{claim.payoutUpiId}</span>
            </div>
          )}
          {claim.payoutBankDetails && (
            <div className="text-[11px] pt-1 border-t border-slate-200 dark:border-slate-800">
              <span className="font-bold">Bank:</span> {claim.payoutBankDetails.bankName} | A/C: {claim.payoutBankDetails.accountNumber} | IFSC: {claim.payoutBankDetails.ifsc} | Name: {claim.payoutBankDetails.accountHolderName}
            </div>
          )}
          {claim.shippingDetails && (
            <div className="text-[11px] pt-1 border-t border-slate-200 dark:border-slate-800">
              <span className="font-bold">Shipping:</span> {claim.shippingDetails.fullName} ({claim.shippingDetails.phone}), {claim.shippingDetails.addressLine}, {claim.shippingDetails.city}, {claim.shippingDetails.state} - {claim.shippingDetails.pincode}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Action selection */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-slate-700 dark:text-slate-300">
              <input
                type="radio"
                name="action"
                value="APPROVE"
                checked={action === 'APPROVE'}
                onChange={() => setAction('APPROVE')}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">Approve Claim</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-slate-700 dark:text-slate-300">
              <input
                type="radio"
                name="action"
                value="REJECT"
                checked={action === 'REJECT'}
                onChange={() => setAction('REJECT')}
                className="text-rose-600 focus:ring-rose-500"
              />
              <span className="text-rose-700 dark:text-rose-400 font-bold">Reject Claim</span>
            </label>
          </div>

          {action === 'APPROVE' ? (
            <div className="space-y-3">
              {claim.maxCashAmount > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label htmlFor="cashCap" className="text-xs">
                      Approved Cash Amount (₹) <span className="text-slate-400">(Max cap: ₹{claim.maxCashAmount})</span>
                    </Label>
                  </div>
                  <Input
                    id="cashCap"
                    type="number"
                    min={0}
                    max={claim.maxCashAmount}
                    value={approvedCash}
                    onChange={(e) => setApprovedCash(parseInt(e.target.value) || 0)}
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    SMC offer specifies &quot;up to ₹{claim.maxCashAmount}&quot;. Enter the final sanctioned disbursement amount.
                  </p>
                </div>
              )}
              <div>
                <Label htmlFor="adminNotes" className="text-xs">Approval Notes (Optional)</Label>
                <Input
                  id="adminNotes"
                  placeholder="e.g. Verified 1st fee cycle and regular class attendance"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          ) : (
            <div>
              <Label htmlFor="rejectionReason" className="text-xs">Rejection Reason <span className="text-red-500">*</span></Label>
              <Input
                id="rejectionReason"
                placeholder="e.g. Student cancelled enrollment before completion"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-1"
                required
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className={action === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold' : 'bg-rose-600 hover:bg-rose-700 text-white font-bold'}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Processing…
                </>
              ) : action === 'APPROVE' ? (
                'Confirm Approval'
              ) : (
                'Reject Claim'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

