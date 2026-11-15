'use client';

import { useEffect, useState } from 'react';
import {
  getMeetingHistory,
  getMeetingTranscript,
  MeetingHistoryResponse,
  TranscriptPage,
} from '@/actions/meet/meeting-history-actions';
import { MeetingParticipantTable } from '@/components/meet/meeting-participant-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, FileText, Download, Calendar, Clock, AlertCircle, Loader2 } from 'lucide-react';

interface MeetingHistoryViewProps {
  classInstanceId: string;
}

export function MeetingHistoryView({ classInstanceId }: MeetingHistoryViewProps) {
  const [history, setHistory] = useState<MeetingHistoryResponse | null>(null);
  const [transcript, setTranscript] = useState<TranscriptPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'participants' | 'transcript' | 'recording'>('participants');

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const hist = await getMeetingHistory(classInstanceId);
        if (mounted) {
          setHistory(hist);
          if (hist.session?.id) {
            const tr = await getMeetingTranscript(hist.session.id, 1);
            if (mounted) setTranscript(tr);
          }
        }
      } catch (err) {
        console.error('Failed to load meeting history:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [classInstanceId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading meeting audit trail...
      </div>
    );
  }

  if (!history || !history.session) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center text-slate-500">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          No Google Meet session has been created for this class yet.
        </CardContent>
      </Card>
    );
  }

  const { session, recording, participants, eventsCount } = history;

  return (
    <div className="space-y-6">
      {/* Session Overview Card */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Video className="w-5 h-5 text-brand-600" />
                {session.batchName} ({session.batchCode})
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">Coach: {session.coachName}</p>
            </div>
            <Badge
              variant={session.status === 'ACTIVE' ? 'success' : 'neutral'}
              className={
                session.status === 'ACTIVE'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-700'
              }
            >
              Status: {session.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-xs text-slate-400 block">Created At</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {new Date(session.createdAt).toLocaleTimeString()}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Started At</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {session.startedAt ? new Date(session.startedAt).toLocaleTimeString() : '—'}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Ended At</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {session.endedAt ? new Date(session.endedAt).toLocaleTimeString() : 'In Progress'}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Telemetry Events</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{eventsCount}</span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('participants')}
          className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'participants'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Participants ({participants.length})
        </button>
        <button
          onClick={() => setActiveTab('recording')}
          className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'recording'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Recording {recording ? '✓' : ''}
        </button>
        <button
          onClick={() => setActiveTab('transcript')}
          className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'transcript'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Transcript ({transcript?.total || 0})
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'participants' && (
        <MeetingParticipantTable participants={participants} />
      )}

      {activeTab === 'recording' && (
        <Card>
          <CardContent className="p-6">
            {recording ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Video className="w-8 h-8 text-brand-600" />
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                        Class Session Recording
                      </h4>
                      <p className="text-xs text-slate-500">
                        Transfer Status: <Badge variant="neutral">{recording.transferStatus}</Badge>
                      </p>
                    </div>
                  </div>
                  {recording.googleDriveUrl && (
                    <a
                      href={recording.googleDriveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded text-sm font-medium"
                    >
                      <Download className="w-4 h-4" /> View in Drive
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-6">
                No recording has been uploaded for this meeting yet.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'transcript' && (
        <Card>
          <CardContent className="p-6 space-y-3">
            {transcript && transcript.entries.length > 0 ? (
              transcript.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg text-sm border border-slate-100 dark:border-slate-800"
                >
                  <span className="font-semibold text-brand-600 text-xs block mb-1">
                    {entry.speakerName || 'Speaker'}
                  </span>
                  <p className="text-slate-700 dark:text-slate-300">{entry.text}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-6">
                No transcript entries recorded for this session.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

