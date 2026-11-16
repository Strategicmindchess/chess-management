'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { AdminTodayClassesView } from './admin-today-classes-view';

interface AdminTodayClassesDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AdminTodayClassesDialog({ open, onClose }: AdminTodayClassesDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Scheduled Classes & WhatsApp Notifications"
      description="Live academy-wide schedule for today and tomorrow. Check reminder status and dispatch 1-time notifications."
      className="max-w-5xl bg-slate-950 border border-slate-800 text-slate-100 shadow-2xl"
    >
      <div className="pt-1">
        <div className="flex justify-end mb-2">
          <Link
            href="/admin/today-classes"
            onClick={onClose}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium hover:underline px-1 py-0.5"
          >
            <span>Open as Full Page</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        <AdminTodayClassesView isModal={true} onClose={onClose} />
      </div>
    </Dialog>
  );
}
