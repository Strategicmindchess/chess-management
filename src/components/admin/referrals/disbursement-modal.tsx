'use client';

import { useState } from 'react';
import { X, CheckCircle2, Truck, IndianRupee, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { recordRewardDisbursement } from '@/actions/referral/admin-referrals';

interface DisbursementModalProps {
  claim: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DisbursementModal({ claim, isOpen, onClose, onSuccess }: DisbursementModalProps) {
  const [fulfilmentType, setFulfilmentType] = useState<'CASH' | 'PHYSICAL_GIFT'>(
    claim?.maxCashAmount > 0 ? 'CASH' : 'PHYSICAL_GIFT'
  );
  const [paymentRef, setPaymentRef] = useState('');
  const [courier, setCourier] = useState('BlueDart');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isDelivered, setIsDelivered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !claim) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await recordRewardDisbursement({
        claimId: claim.id,
        fulfilmentType,
        paymentReference: fulfilmentType === 'CASH' ? paymentRef.trim() : undefined,
        deliveryCourier: fulfilmentType === 'PHYSICAL_GIFT' ? courier.trim() : undefined,
        deliveryTrackingNumber: fulfilmentType === 'PHYSICAL_GIFT' ? trackingNumber.trim() : undefined,
        isDelivered,
      });

      if (!res.success) {
        setError(res.error || 'Failed to record fulfillment.');
        setIsSubmitting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Server error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#181c26]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Fulfill Reward: {claim.milestoneTitle}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Recipient: <strong>{claim.user?.name}</strong>
        </p>

        {error && (
          <div className="mt-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {claim.rewardType === 'HYBRID' && (
            <div className="flex gap-4 border-b border-slate-100 pb-3 text-xs font-semibold">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="CASH"
                  checked={fulfilmentType === 'CASH'}
                  onChange={() => setFulfilmentType('CASH')}
                />
                <span>Cash Disbursement</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="PHYSICAL_GIFT"
                  checked={fulfilmentType === 'PHYSICAL_GIFT'}
                  onChange={() => setFulfilmentType('PHYSICAL_GIFT')}
                />
                <span>Smartwatch Courier</span>
              </label>
            </div>
          )}

          {fulfilmentType === 'CASH' ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-emerald-50/70 p-3 text-xs text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300">
                <div className="font-bold flex items-center gap-1">
                  <IndianRupee className="h-3.5 w-3.5" />
                  Approved Cash Amount: ₹{claim.approvedCashAmount || claim.maxCashAmount}
                </div>
                {claim.payoutUpiId && <div className="mt-1 font-mono text-[11px]">UPI: {claim.payoutUpiId}</div>}
              </div>

              <div>
                <Label htmlFor="paymentRef" className="text-xs">
                  Bank / UPI UTR Number or Reference <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="paymentRef"
                  placeholder="e.g. 423589102431"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="mt-1 font-mono uppercase"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {claim.shippingDetails && (
                <div className="rounded-lg bg-amber-50/70 p-3 text-[11px] text-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
                  <div className="font-bold">Ship To:</div>
                  <div>{claim.shippingDetails.fullName} ({claim.shippingDetails.phone})</div>
                  <div>{claim.shippingDetails.addressLine}, {claim.shippingDetails.city}, {claim.shippingDetails.state} - {claim.shippingDetails.pincode}</div>
                </div>
              )}

              <div>
                <Label htmlFor="courier" className="text-xs">Courier Name <span className="text-red-500">*</span></Label>
                <Input
                  id="courier"
                  placeholder="e.g. BlueDart, DTDC, Delhivery"
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="trackingNumber" className="text-xs">Tracking / AWB Number <span className="text-red-500">*</span></Label>
                <Input
                  id="trackingNumber"
                  placeholder="e.g. 12938491023"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="mt-1 font-mono uppercase"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isDelivered"
                  checked={isDelivered}
                  onChange={(e) => setIsDelivered(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <Label htmlFor="isDelivered" className="text-xs cursor-pointer">
                  Item already delivered to recipient
                </Label>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Recording…
                </>
              ) : (
                'Save Disbursement'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

