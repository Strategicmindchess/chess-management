'use client';

import React, { useState, useTransition } from 'react';
import { triggerManualSync } from '@/actions/data-sync-actions';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';

type SyncRun = {
  id: string;
  status: string;
  chessComState: string | null;
  lichessState: string | null;
  error: string | null;
  startedAt: Date;
  completedAt: Date;
};

type SyncData = {
  studentProfileId: string;
  name: string;
  chessComUsername: string | null;
  lichessUsername: string | null;
  latestRun: SyncRun | null;
};

export function DataSyncTable({ data }: { data: SyncData[] }) {
  const [isPending, startTransition] = useTransition();
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleSync = (studentProfileId: string) => {
    setSyncingId(studentProfileId);
    startTransition(async () => {
      try {
        const res = await triggerManualSync(studentProfileId);
        if (!res.success) {
          alert(res.message);
        } else {
          // Just visual feedback, page revalidation would be better
          alert('Sync queued successfully!');
        }
      } catch (e: any) {
        alert(e.message);
      } finally {
        setSyncingId(null);
      }
    });
  };

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="p-4 font-medium text-gray-600">Student</th>
            <th className="p-4 font-medium text-gray-600">Accounts</th>
            <th className="p-4 font-medium text-gray-600">Last Outcome</th>
            <th className="p-4 font-medium text-gray-600">Provider States (CC | LI)</th>
            <th className="p-4 font-medium text-gray-600">Last Attempt</th>
            <th className="p-4 font-medium text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((row) => (
            <tr key={row.studentProfileId} className="hover:bg-gray-50">
              <td className="p-4 font-medium text-gray-900">{row.name}</td>
              <td className="p-4 text-gray-500">
                {row.chessComUsername && <div className="text-xs font-semibold text-green-700 bg-green-100 inline-block px-2 py-0.5 rounded mr-1">CC: {row.chessComUsername}</div>}
                {row.lichessUsername && <div className="text-xs font-semibold text-blue-700 bg-blue-100 inline-block px-2 py-0.5 rounded">LI: {row.lichessUsername}</div>}
              </td>
              <td className="p-4">
                {!row.latestRun ? (
                  <span className="text-gray-400">Never</span>
                ) : row.latestRun.status === 'UPDATED' ? (
                  <span className="flex items-center text-green-600"><CheckCircle className="w-4 h-4 mr-1"/> UPDATED</span>
                ) : row.latestRun.status === 'PRESERVED' ? (
                  <span className="flex items-center text-amber-600"><AlertCircle className="w-4 h-4 mr-1"/> PRESERVED</span>
                ) : row.latestRun.status === 'IN_PROGRESS' ? (
                  <span className="flex items-center text-blue-600"><RefreshCw className="w-4 h-4 mr-1 animate-spin"/> SYNCING...</span>
                ) : (
                  <span className="flex items-center text-red-600"><XCircle className="w-4 h-4 mr-1"/> FAILED</span>
                )}
                {row.latestRun?.error && <div className="text-xs text-red-500 mt-1 max-w-[200px] truncate" title={row.latestRun.error}>{row.latestRun.error}</div>}
              </td>
              <td className="p-4">
                {!row.latestRun ? (
                  <span className="text-gray-400">-</span>
                ) : (
                  <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded border">
                    {row.latestRun.chessComState || 'N/A'} | {row.latestRun.lichessState || 'N/A'}
                  </span>
                )}
              </td>
              <td className="p-4 text-gray-500 text-xs">
                {row.latestRun ? (
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(row.latestRun.completedAt).toLocaleString()}
                  </div>
                ) : '-'}
              </td>
              <td className="p-4">
                <button
                  onClick={() => handleSync(row.studentProfileId)}
                  disabled={syncingId === row.studentProfileId}
                  className="flex items-center text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${syncingId === row.studentProfileId ? 'animate-spin' : ''}`} />
                  Sync
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
