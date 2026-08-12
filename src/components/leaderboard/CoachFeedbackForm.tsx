'use client';

import { useState, useTransition } from 'react';
import { submitCoachFeedback } from '@/actions/leaderboard/leaderboard-actions';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface CoachFeedbackFormProps {
  studentProfileId: string;
  studentName: string;
  periodType: 'WEEKLY' | 'MONTHLY';
  periodStart: string;
  existing?: {
    engagement: number;
    behaviour: number;
    conceptAdoption: number;
    joiningOnTime: number;
    cameraOn: number;
    remarks?: string | null;
  } | null;
  onSuccess?: () => void;
}

const CATEGORIES = [
  { key: 'engagement' as const, label: 'Student Engagement', description: 'Active participation in class' },
  { key: 'behaviour' as const, label: 'Behaviour in Class', description: 'Discipline and respect' },
  { key: 'conceptAdoption' as const, label: 'Concept Adoption', description: 'Understanding and applying concepts' },
  { key: 'joiningOnTime' as const, label: 'Joining on Time', description: 'Punctuality in joining sessions' },
  { key: 'cameraOn' as const, label: 'Camera On During Class', description: 'Camera on during sessions' },
];

function ScoreSlider({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold text-slate-700">{label}</p>
          <p className="text-[11px] text-slate-400">{description}</p>
        </div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${
          value >= 8 ? 'bg-emerald-100 text-emerald-700' :
          value >= 5 ? 'bg-amber-100 text-amber-700' :
          'bg-red-100 text-red-700'
        }`}>
          {value}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-400 w-4">0</span>
        <input
          type="range"
          min={0}
          max={10}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="flex-1 accent-brand-600 h-1.5"
        />
        <span className="text-[10px] text-slate-400 w-4">10</span>
      </div>
    </div>
  );
}

export function CoachFeedbackForm({
  studentProfileId,
  studentName,
  periodType,
  periodStart,
  existing,
  onSuccess,
}: CoachFeedbackFormProps) {
  const [values, setValues] = useState({
    engagement: existing?.engagement ?? 5,
    behaviour: existing?.behaviour ?? 5,
    conceptAdoption: existing?.conceptAdoption ?? 5,
    joiningOnTime: existing?.joiningOnTime ?? 5,
    cameraOn: existing?.cameraOn ?? 5,
  });
  const [remarks, setRemarks] = useState(existing?.remarks ?? '');
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  const total = values.engagement + values.behaviour + values.conceptAdoption + values.joiningOnTime + values.cameraOn;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const res = await submitCoachFeedback({
        studentProfileId,
        periodType,
        periodStart,
        ...values,
        remarks: remarks || undefined,
      });
      setResult(res);
      if (res.success && onSuccess) onSuccess();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-bold text-slate-800">{studentName}</p>
          <p className="text-xs text-slate-400">Monthly coach feedback</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-brand-600">{total}</p>
          <p className="text-[10px] text-slate-400">/ 50 pts</p>
        </div>
      </div>

      {CATEGORIES.map((cat) => (
        <ScoreSlider
          key={cat.key}
          label={cat.label}
          description={cat.description}
          value={values[cat.key]}
          onChange={(v) => setValues((prev) => ({ ...prev, [cat.key]: v }))}
        />
      ))}

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Additional Remarks (optional)
        </label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          placeholder="Any specific feedback for this student..."
        />
      </div>

      {result && (
        <div className={`flex items-center gap-2 p-2 rounded-lg text-xs ${result.success ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {result.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {result.success ? 'Feedback submitted successfully!' : result.error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
      >
        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {existing ? 'Update Feedback' : 'Submit Feedback'}
      </button>
    </form>
  );
}
