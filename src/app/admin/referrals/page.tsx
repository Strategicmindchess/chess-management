import type { Metadata } from 'next';
import { requireRole } from '@/lib/dal';
import { Role } from '@/lib/enums';
import { getAdminReferralOverview } from '@/actions/referral/admin-referrals';
import { AdminReferralsDashboard } from '@/components/admin/referrals/admin-referrals-dashboard';

export const metadata: Metadata = {
  title: 'Referral Program Management · SMC CRM',
  description: 'Manage referral records, approve reward claims, and configure milestone tiers.',
};

export default async function AdminReferralsPage() {
  await requireRole([Role.ADMIN]);
  const overviewData = await getAdminReferralOverview();

  return <AdminReferralsDashboard initialData={overviewData} />;
}

