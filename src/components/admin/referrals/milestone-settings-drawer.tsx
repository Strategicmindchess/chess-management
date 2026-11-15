'use client';

import { useState } from 'react';
import { X, Settings2, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { updateMilestonesConfig } from '@/actions/referral/admin-referrals';

interface MilestoneSettingsDrawerProps {
  milestones: any[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MilestoneSettingsDrawer({
  milestones,
  isOpen,
  onClose,
  onSuccess,
}: MilestoneSettingsDrawerProps) {
  const [items, setItems] = useState<any[]>(milestones);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdateField = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await updateMilestonesConfig(
        items.map((m) => ({
          id: m.id,
          requiredReferrals: Number(m.requiredReferrals),
          title: m.title,
          rewardType: m.rewardType,
          maxCashAmount: Number(m.maxCashAmount || 0),
          giftDescription: m.giftDescription || null,
          isCumulative: Boolean(m.isCumulative),
          isActive: Boolean(m.isActive),
        }))
      );

      if (!res.success) {
        setError('Failed to update milestone configuration.');
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
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#181c26]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-[#A94D0B] dark:bg-amber-950/60 dark:text-amber-400">
            <Settings2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Configure Reward Milestones
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set referral thresholds, reward ceilings, and cumulative rules.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-5 space-y-5">
          {items.map((m, idx) => (
            <div
              key={m.id}
              className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800">
                <span className="font-bold text-xs uppercase tracking-wider text-[#A94D0B] dark:text-amber-400">
                  Tier {m.milestoneOrder}: {m.title}
                </span>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={m.isActive}
                    onChange={(e) => handleUpdateField(idx, 'isActive', e.target.checked)}
                    className="rounded border-slate-300 text-[#A94D0B] focus:ring-[#A94D0B]"
                  />
                  <span>Active</span>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label className="text-xs">Required Qualified Referrals</Label>
                  <Input
                    type="number"
                    min={1}
                    value={m.requiredReferrals}
                    onChange={(e) => handleUpdateField(idx, 'requiredReferrals', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Max Cash Cap (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={m.maxCashAmount}
                    onChange={(e) => handleUpdateField(idx, 'maxCashAmount', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Physical Gift Description</Label>
                  <Input
                    placeholder="e.g. Smartwatch"
                    value={m.giftDescription || ''}
                    onChange={(e) => handleUpdateField(idx, 'giftDescription', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-[#A94D0B] hover:bg-[#8e4008] text-white font-bold"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  Save Configurations
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

