import { prisma } from '@/lib/prisma';
import { DataSyncTable } from '@/components/admin/data-sync-table';
import { Activity } from 'lucide-react';
import React from 'react';

export const dynamic = 'force-dynamic';

export default async function DataSyncPage() {
  const students = await prisma.studentProfile.findMany({
    where: {
      chessAccount: {
        isNot: null,
      },
    },
    include: {
      user: {
        select: { name: true },
      },
      chessAccount: true,
      syncRuns: {
        orderBy: { completedAt: 'desc' },
        take: 1,
      },
    },
    orderBy: {
      user: { name: 'asc' },
    },
  });

  const data = students.map((s) => ({
    studentProfileId: s.id,
    name: s.user.name || 'Unknown',
    chessComUsername: s.chessAccount?.chessComUsername || null,
    lichessUsername: s.chessAccount?.lichessUsername || null,
    latestRun: s.syncRuns[0] ? {
      id: s.syncRuns[0].id,
      status: s.syncRuns[0].status,
      chessComState: s.syncRuns[0].chessComState,
      lichessState: s.syncRuns[0].lichessState,
      error: s.syncRuns[0].error,
      startedAt: s.syncRuns[0].startedAt,
      completedAt: s.syncRuns[0].completedAt,
    } : null,
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Activity className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Sync Dashboard</h1>
          <p className="text-sm text-gray-500">Monitor background sync status and worker health</p>
        </div>
      </div>
      
      <DataSyncTable data={data} />
    </div>
  );
}
