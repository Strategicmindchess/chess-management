'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  CheckCircle2,
  Clock,
  IndianRupee,
  Watch,
  Search,
  Download,
  Settings2,
  Award,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminReferralTable } from './admin-referral-table';
import { ClaimReviewModal } from './claim-review-modal';
import { DisbursementModal } from './disbursement-modal';
import { MilestoneSettingsDrawer } from './milestone-settings-drawer';
import { exportReferralsCsv } from '@/actions/referral/admin-referrals';

interface AdminReferralsDashboardProps {
  initialData: {
    stats: {
      totalAttributions: number;
      totalQualified: number;
      pendingClaims: number;
      totalCashDisbursed: number;
      totalGiftsDispatched: number;
    };
    pagination: {
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
    };
    attributions: any[];
    claims: any[];
    milestones: any[];
  };
}

export function AdminReferralsDashboard({ initialData }: AdminReferralsDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'claims' | 'attributions'>('claims');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [selectedReviewClaim, setSelectedReviewClaim] = useState<any | null>(null);
  const [selectedDisburseClaim, setSelectedDisburseClaim] = useState<any | null>(null);
  const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const res = await exportReferralsCsv();
      if (res.success && res.csv) {
        const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', res.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const filteredAttributions = initialData.attributions.filter((a) => {
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    const matchesSearch =
      !search ||
      a.code.toLowerCase().includes(search.toLowerCase()) ||
      a.referrer.name.toLowerCase().includes(search.toLowerCase()) ||
      a.referrer.email.toLowerCase().includes(search.toLowerCase()) ||
      a.candidate.name.toLowerCase().includes(search.toLowerCase()) ||
      a.candidate.email.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Title & Global Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="h-7 w-7 text-[#A94D0B] dark:text-amber-400" />
            <span>Referral Program Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monitor student attributions, approve reward claims with discretionary cash caps, and manage smartwatch courier tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setIsConfigDrawerOpen(true)}
            variant="secondary"
            size="sm"
            className="text-xs font-semibold"
          >
            <Settings2 className="mr-1.5 h-3.5 w-3.5" />
            Milestone Settings
          </Button>

          <Button
            onClick={handleExportCsv}
            disabled={isExporting}
            variant="gradient"
            size="sm"
            className="text-xs font-semibold"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {isExporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161a24]">
          <span className="text-xs font-medium text-slate-500">Total Leads</span>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {initialData.stats.totalAttributions}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">Recorded invites</p>
        </div>

        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Qualified Students</span>
          <div className="mt-2 text-2xl font-black text-emerald-900 dark:text-emerald-200">
            {initialData.stats.totalQualified}
          </div>
          <p className="mt-0.5 text-[11px] text-emerald-700/80 dark:text-emerald-400/80">Paid & batch assigned</p>
        </div>

        <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <span className="text-xs font-medium text-amber-800 dark:text-amber-300">Pending Claims</span>
          <div className="mt-2 text-2xl font-black text-amber-900 dark:text-amber-200">
            {initialData.stats.pendingClaims}
          </div>
          <p className="mt-0.5 text-[11px] text-amber-700/80 dark:text-amber-400/80">Requires review</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161a24]">
          <span className="text-xs font-medium text-slate-500">Cash Disbursed</span>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            ₹{initialData.stats.totalCashDisbursed.toLocaleString('en-IN')}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">Total bank paid</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161a24]">
          <span className="text-xs font-medium text-slate-500">Smartwatches</span>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {initialData.stats.totalGiftsDispatched}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">Dispatched / Delivered</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('claims')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
            activeTab === 'claims'
              ? 'border-[#A94D0B] text-[#A94D0B] dark:border-amber-400 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Award className="h-4 w-4" />
          <span>Reward Claims ({initialData.claims.length})</span>
          {initialData.stats.pendingClaims > 0 && (
            <span className="ml-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold text-white">
              {initialData.stats.pendingClaims}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('attributions')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
            activeTab === 'attributions'
              ? 'border-[#A94D0B] text-[#A94D0B] dark:border-amber-400 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>All Attributions ({initialData.attributions.length})</span>
        </button>
      </div>

      {/* Tab 1: Reward Claims */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          {initialData.claims.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-[#161a24]">
              No claims submitted yet. As students reach milestones, claims will appear here for verification.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-[#161a24]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50/75 text-slate-600 dark:border-slate-800 dark:bg-[#121620] dark:text-slate-400">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Student</th>
                      <th className="py-3 px-4 font-semibold">Milestone / Reward</th>
                      <th className="py-3 px-4 font-semibold">Payout / Shipping Info</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Fulfillment Info</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {initialData.claims.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{c.user.name}</div>
                          <div className="text-[11px] text-slate-500">{c.user.email}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#A94D0B] dark:text-amber-400">{c.milestoneTitle}</div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-300">
                            {c.rewardType === 'CASH' && `Up to ₹${c.maxCashAmount}`}
                            {c.rewardType === 'PHYSICAL_GIFT' && c.giftDescription}
                            {c.rewardType === 'HYBRID' && `Smartwatch + Up to ₹${c.maxCashAmount}`}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[11px]">
                          {c.payoutUpiId && <div><strong>UPI:</strong> {c.payoutUpiId}</div>}
                          {c.payoutBankDetails && <div><strong>Bank:</strong> {c.payoutBankDetails.accountNumber} ({c.payoutBankDetails.ifsc})</div>}
                          {c.shippingDetails && (
                            <div>
                              <strong>Ship:</strong> {c.shippingDetails.city}, {c.shippingDetails.state} - {c.shippingDetails.pincode}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              c.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : c.status === 'APPROVED'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                : c.status === 'PAID' || c.status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : c.status === 'DISPATCHED'
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[11px]">
                          {c.paymentReference && <div><strong>UTR:</strong> {c.paymentReference}</div>}
                          {c.deliveryTrackingNumber && <div><strong>Tracking:</strong> {c.deliveryCourier} ({c.deliveryTrackingNumber})</div>}
                          {c.rejectedReason && <div className="text-rose-600">{c.rejectedReason}</div>}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {c.status === 'PENDING' && (
                              <Button
                                onClick={() => setSelectedReviewClaim(c)}
                                size="sm"
                                className="bg-[#A94D0B] hover:bg-[#8e4008] text-white font-bold text-xs"
                              >
                                Review Claim
                              </Button>
                            )}
                            {(c.status === 'APPROVED' || c.status === 'DISPATCHED') && (
                              <Button
                                onClick={() => setSelectedDisburseClaim(c)}
                                size="sm"
                                variant="secondary"
                                className="text-xs font-semibold"
                              >
                                Record Fulfillment
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: All Attributions */}
      {activeTab === 'attributions' && (
        <div className="space-y-4">
          {/* Search & Status Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search code, candidate, referrer…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm dark:border-slate-800 dark:bg-[#161a24] dark:text-slate-300"
              >
                <option value="ALL">All Statuses</option>
                <option value="JOINED_SUCCESSFULLY">Joined Successfully (Qualified)</option>
                <option value="REGISTERED">Registered</option>
                <option value="PENDING">Pending</option>
                <option value="DISQUALIFIED">Disqualified</option>
              </select>
            </div>
          </div>

          <AdminReferralTable attributions={filteredAttributions} />
        </div>
      )}

      {/* Modals */}
      <ClaimReviewModal
        claim={selectedReviewClaim}
        isOpen={Boolean(selectedReviewClaim)}
        onClose={() => setSelectedReviewClaim(null)}
        onSuccess={() => router.refresh()}
      />

      <DisbursementModal
        claim={selectedDisburseClaim}
        isOpen={Boolean(selectedDisburseClaim)}
        onClose={() => setSelectedDisburseClaim(null)}
        onSuccess={() => router.refresh()}
      />

      <MilestoneSettingsDrawer
        milestones={initialData.milestones}
        isOpen={isConfigDrawerOpen}
        onClose={() => setIsConfigDrawerOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}

