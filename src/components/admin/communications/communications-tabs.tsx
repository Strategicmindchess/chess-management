'use client';

import { Send, Layers, History, Sparkles } from 'lucide-react';

export type CommTab = 'input' | 'template' | 'history';

interface CommunicationsTabsProps {
  activeTab: CommTab;
  onChange: (tab: CommTab) => void;
  historyCount?: number;
}

export function CommunicationsTabs({ activeTab, onChange, historyCount }: CommunicationsTabsProps) {
  return (
    <div className="flex items-center gap-2 p-1.5 bg-slate-900/90 border border-slate-800 rounded-xl backdrop-blur-xl w-fit">
      <button
        type="button"
        onClick={() => onChange('input')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
          activeTab === 'input'
            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <Send className="w-3.5 h-3.5" />
        Input (Broadcast)
      </button>

      <button
        type="button"
        onClick={() => onChange('template')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
          activeTab === 'template'
            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <Layers className="w-3.5 h-3.5" />
        Template
        <span className="bg-purple-500/20 text-purple-300 text-[10px] px-1.5 py-0.2 rounded font-bold">
          4
        </span>
      </button>

      <button
        type="button"
        onClick={() => onChange('history')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
          activeTab === 'history'
            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <History className="w-3.5 h-3.5" />
        History
        {historyCount !== undefined && historyCount > 0 && (
          <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.2 rounded font-bold">
            {historyCount}
          </span>
        )}
      </button>
    </div>
  );
}
