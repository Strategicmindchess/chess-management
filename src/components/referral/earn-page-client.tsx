'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ReferralHeroCard } from './referral-hero-card';
import { ReferralStatsCards } from './referral-stats-cards';
import { MilestoneProgressTracker } from './milestone-progress-tracker';
import { ReferralActivityTable } from './referral-activity-table';
import { RewardClaimsTable } from './reward-claims-table';
import { ClaimRewardModal } from './claim-reward-modal';
import { ProgramTermsModal } from './program-terms-modal';
import { FileText, Sparkles } from 'lucide-react';
import type { MilestoneProgressItem } from '@/services/referral/milestone.service';

interface EarnPageClientProps {
  initialData: {
    referralCode: string;
    shareableUrl: string;
    stats: {
      totalInvited: number;
      registered: number;
      joinedSuccessfully: number;
      pendingVerification: number;
      totalEarnedCash: number;
      physicalGiftsClaimed: number;
    };
    milestoneStatus: {
      totalQualifiedCount: number;
      milestones: MilestoneProgressItem[];
      activeMilestone: MilestoneProgressItem;
      overallProgressPercentage: number;
    };
    referrals: any[];
    rewardClaims: any[];
    programTermsMarkdown: string | null;
  };
}

export function EarnPageClient({ initialData }: EarnPageClientProps) {
  const router = useRouter();
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneProgressItem | null>(null);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  const handleOpenClaimModal = (milestone: MilestoneProgressItem) => {
    setSelectedMilestone(milestone);
    setIsClaimModalOpen(true);
  };

  const handleClaimSuccess = () => {
    router.refresh();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Hero Card with Code & Share Links */}
      <ReferralHeroCard
        referralCode={initialData.referralCode}
        shareableUrl={initialData.shareableUrl}
      />

      {/* 2. Key Metrics Summary */}
      <ReferralStatsCards stats={initialData.stats} />

      {/* 3. Milestone Multi-Tier Progress & Claim CTAs */}
      <MilestoneProgressTracker
        totalQualifiedCount={initialData.milestoneStatus.totalQualifiedCount}
        milestones={initialData.milestoneStatus.milestones}
        activeMilestone={initialData.milestoneStatus.activeMilestone}
        overallProgressPercentage={initialData.milestoneStatus.overallProgressPercentage}
        onOpenClaimModal={handleOpenClaimModal}
      />

      {/* 4. Active Claims History */}
      <RewardClaimsTable claims={initialData.rewardClaims} />

      {/* 5. Referral Attribution History Table */}
      <ReferralActivityTable referrals={initialData.referrals} />

      {/* Footer / Terms Link */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>Strategic Mind Chess • Referral & Rewards Program</span>
        </div>
        <button
          onClick={() => setIsTermsModalOpen(true)}
          className="inline-flex items-center gap-1.5 font-semibold text-amber-700 hover:text-amber-800 hover:underline dark:text-amber-400"
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Program Terms & Conditions</span>
        </button>
      </div>

      {/* Modals */}
      <ClaimRewardModal
        milestone={selectedMilestone}
        isOpen={isClaimModalOpen}
        onClose={() => {
          setIsClaimModalOpen(false);
          setSelectedMilestone(null);
        }}
        onClaimSuccess={handleClaimSuccess}
      />

      <ProgramTermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        customTerms={initialData.programTermsMarkdown}
      />
    </div>
  );
}

