import { requireRole } from '@/lib/dal';
import { Role } from '@/lib/enums';
import { AdminTodayClassesView } from '@/components/admin/admin-today-classes-view';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Today's Scheduled Classes | SMC Admin",
  description: "Live overview of today and tomorrow's scheduled classes and WhatsApp notifications.",
};

export default async function AdminTodayClassesPage() {
  await requireRole([Role.ADMIN]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      <AdminTodayClassesView isModal={false} />
    </div>
  );
}
