import type { Metadata } from 'next';
import { requireRole } from '@/lib/dal';
import { Role } from '@/lib/enums';
import { getReferralDashboard } from '@/actions/referral/get-referral-dashboard';
import { EarnPageClient } from '@/components/referral/earn-page-client';

export const metadata: Metadata = {
  title: 'Earn with SMC · Strategic Mind Chess',
  description: 'Invite chessmates to Strategic Mind Chess and earn milestone cash rewards and smartwatches.',
};

export default async function StudentEarnPage() {
  await requireRole([Role.STUDENT]);
  const dashboardData = await getReferralDashboard();

  return <EarnPageClient initialData={dashboardData} />;
}

