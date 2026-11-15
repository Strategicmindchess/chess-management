'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Gift, IndianRupee, Truck, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { FieldError } from '@/components/ui/field-error';
import { claimMilestoneReward } from '@/actions/referral/claim-milestone-reward';
import type { MilestoneProgressItem } from '@/services/referral/milestone.service';

interface ClaimRewardModalProps {
  milestone: MilestoneProgressItem | null;
  isOpen: boolean;
  onClose: () => void;
  onClaimSuccess: () => void;
}

const formSchema = z.object({
  payoutMethod: z.enum(['UPI', 'BANK']),
  payoutUpiId: z.string().optional(),
  accountNumber: z.string().optional(),
  ifsc: z.string().optional(),
  accountHolderName: z.string().optional(),
  bankName: z.string().optional(),

  // Shipping
  shippingFullName: z.string().optional(),
  shippingPhone: z.string().optional(),
  shippingAddressLine: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingState: z.string().optional(),
  shippingPincode: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function ClaimRewardModal({ milestone, isOpen, onClose, onClaimSuccess }: ClaimRewardModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      payoutMethod: 'UPI',
      payoutUpiId: '',
      accountNumber: '',
      ifsc: '',
      accountHolderName: '',
      bankName: '',
      shippingFullName: '',
      shippingPhone: '',
      shippingAddressLine: '',
      shippingCity: '',
      shippingState: '',
      shippingPincode: '',
    },
  });

  if (!isOpen || !milestone) return null;

  const needsCashPayout = milestone.rewardType === 'CASH' || milestone.rewardType === 'HYBRID';
  const needsPhysicalShipping = milestone.rewardType === 'PHYSICAL_GIFT' || milestone.rewardType === 'HYBRID';
  const payoutMethod = watch('payoutMethod');

  const onSubmit = async (values: FormData) => {
    setServerError(null);
    setIsSubmitting(true);

    try {
      // Validate cash payout
      if (needsCashPayout) {
        if (values.payoutMethod === 'UPI') {
          if (!values.payoutUpiId || !values.payoutUpiId.includes('@')) {
            setServerError('Please enter a valid UPI ID (e.g. yourname@oksbi).');
            setIsSubmitting(false);
            return;
          }
        } else {
          if (!values.accountNumber || !values.ifsc || !values.accountHolderName || !values.bankName) {
            setServerError('Please fill in all bank account details.');
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Validate physical shipping
      if (needsPhysicalShipping) {
        if (
          !values.shippingFullName ||
          !values.shippingPhone ||
          !values.shippingAddressLine ||
          !values.shippingCity ||
          !values.shippingState ||
          !values.shippingPincode
        ) {
          setServerError('Please fill in complete delivery shipping details for your smartwatch.');
          setIsSubmitting(false);
          return;
        }
        if (!/^\d{6}$/.test(values.shippingPincode.trim())) {
          setServerError('PIN code must be a valid 6-digit Indian postal code.');
          setIsSubmitting(false);
          return;
        }
      }

      const res = await claimMilestoneReward({
        milestoneId: milestone.id,
        payoutUpiId: values.payoutMethod === 'UPI' ? values.payoutUpiId?.trim() : undefined,
        payoutBankDetails:
          values.payoutMethod === 'BANK'
            ? {
                accountNumber: values.accountNumber!.trim(),
                ifsc: values.ifsc!.trim().toUpperCase(),
                accountHolderName: values.accountHolderName!.trim(),
                bankName: values.bankName!.trim(),
              }
            : undefined,
        shippingDetails: needsPhysicalShipping
          ? {
              fullName: values.shippingFullName!.trim(),
              phone: values.shippingPhone!.trim(),
              addressLine: values.shippingAddressLine!.trim(),
              city: values.shippingCity!.trim(),
              state: values.shippingState!.trim(),
              pincode: values.shippingPincode!.trim(),
            }
          : undefined,
      });

      if (!res.success) {
        setServerError(res.error || 'Failed to submit reward claim.');
        setIsSubmitting(false);
        return;
      }

      onClaimSuccess();
      onClose();
    } catch (err: any) {
      setServerError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#181c26]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-[#A94D0B] dark:bg-amber-950/60 dark:text-amber-400">
            <Gift className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Claim {milestone.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Submit your payout / delivery preferences to receive your milestone reward.
            </p>
          </div>
        </div>

        {serverError && (
          <div className="mt-4">
            <Alert variant="error">{serverError}</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-5">
          {/* Section 1: Cash Reward Details */}
          {needsCashPayout && (
            <div className="space-y-3 rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/10">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-900 dark:text-emerald-300">
                <IndianRupee className="h-4 w-4" />
                <span>Cash Reward (Up to ₹{milestone.maxCashAmount.toLocaleString('en-IN')})</span>
              </div>

              {/* Payout method toggle */}
              <div className="flex gap-4 text-xs font-semibold">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    value="UPI"
                    {...register('payoutMethod')}
                    className="text-[#A94D0B] focus:ring-[#A94D0B]"
                  />
                  <span>UPI ID (Instant)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    value="BANK"
                    {...register('payoutMethod')}
                    className="text-[#A94D0B] focus:ring-[#A94D0B]"
                  />
                  <span>Bank Account (NEFT/IMPS)</span>
                </label>
              </div>

              {payoutMethod === 'UPI' ? (
                <div>
                  <Label htmlFor="payoutUpiId" className="text-xs">UPI ID <span className="text-red-500">*</span></Label>
                  <Input
                    id="payoutUpiId"
                    {...register('payoutUpiId')}
                    placeholder="e.g. mobile@oksbi, username@upi"
                    className="mt-1"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="col-span-2">
                    <Label htmlFor="accountHolderName" className="text-xs">Account Holder Name <span className="text-red-500">*</span></Label>
                    <Input id="accountHolderName" {...register('accountHolderName')} placeholder="Full Name as per bank" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="accountNumber" className="text-xs">Account Number <span className="text-red-500">*</span></Label>
                    <Input id="accountNumber" {...register('accountNumber')} placeholder="000123456789" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="ifsc" className="text-xs">IFSC Code <span className="text-red-500">*</span></Label>
                    <Input id="ifsc" {...register('ifsc')} placeholder="SBIN0001234" className="mt-1 uppercase" />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="bankName" className="text-xs">Bank Name <span className="text-red-500">*</span></Label>
                    <Input id="bankName" {...register('bankName')} placeholder="State Bank of India / HDFC Bank" className="mt-1" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 2: Physical Smartwatch Shipping Details */}
          {needsPhysicalShipping && (
            <div className="space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/30 p-4 dark:border-amber-900/40 dark:bg-amber-950/10">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-300">
                <Truck className="h-4 w-4" />
                <span>Physical Delivery ({milestone.giftDescription || 'Smartwatch'})</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label htmlFor="shippingFullName" className="text-xs">Full Name <span className="text-red-500">*</span></Label>
                  <Input id="shippingFullName" {...register('shippingFullName')} placeholder="Recipient Full Name" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="shippingPhone" className="text-xs">Contact Phone <span className="text-red-500">*</span></Label>
                  <Input id="shippingPhone" {...register('shippingPhone')} placeholder="10-digit mobile" className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="shippingAddressLine" className="text-xs">House / Flat, Street, Area <span className="text-red-500">*</span></Label>
                  <Input id="shippingAddressLine" {...register('shippingAddressLine')} placeholder="e.g. Flat 302, Royal Residency, Station Road" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="shippingCity" className="text-xs">City <span className="text-red-500">*</span></Label>
                  <Input id="shippingCity" {...register('shippingCity')} placeholder="City" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="shippingState" className="text-xs">State <span className="text-red-500">*</span></Label>
                  <Input id="shippingState" {...register('shippingState')} placeholder="State" className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="shippingPincode" className="text-xs">Postal PIN Code <span className="text-red-500">*</span></Label>
                  <Input id="shippingPincode" {...register('shippingPincode')} placeholder="e.g. 284001" className="mt-1" maxLength={6} />
                </div>
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#A94D0B] hover:bg-[#8e4008] text-white font-bold"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting Claim…
                </>
              ) : (
                'Submit Reward Claim'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

