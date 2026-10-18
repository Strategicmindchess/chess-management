'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck, 
  PhoneCall, 
  Webhook, 
  Layers, 
  Eye, 
  MessageSquare,
  Calendar,
  Trophy,
  AlertTriangle
} from 'lucide-react';

interface TemplateDef {
  name: string;
  category: 'UTILITY' | 'MARKETING';
  language: string;
  status: 'ACTIVE' | 'APPROVED';
  description: string;
  icon: any;
  parameters: Array<{ key: string; label: string; sample: string }>;
  samplePreview: string;
}

const TEMPLATES: TemplateDef[] = [
  {
    name: 'smc_class_reminder',
    category: 'UTILITY',
    language: 'en',
    status: 'ACTIVE',
    description: 'Automatic & manual reminder sent before scheduled chess classes with Google Meet link.',
    icon: Calendar,
    parameters: [
      { key: 'student_name', label: 'Student Name', sample: 'Rahul Sharma' },
      { key: 'batch_name', label: 'Batch Name', sample: 'Special Batch (42XK)' },
      { key: 'class_date', label: 'Class Date', sample: '18 Oct' },
      { key: 'class_time', label: 'Class Time', sample: '05:00 PM' },
      { key: 'class_link', label: 'Google Meet URL', sample: 'https://meet.google.com/smc-chess-class' },
    ],
    samplePreview: '♟️ *Strategic Mind Chess — Class Reminder*\n\nHello *Rahul Sharma*,\n\nYour upcoming chess session for *Special Batch (42XK)* is scheduled for today:\n📅 *Date:* 18 Oct\n⏰ *Time:* 05:00 PM\n🔗 *Class Link:* https://meet.google.com/smc-chess-class\n\nPlease join 5 minutes early with your chessboard ready!',
  },
  {
    name: 'smc_holiday',
    category: 'UTILITY',
    language: 'en',
    status: 'ACTIVE',
    description: 'Broadcast announcement when the academy is closed for festivals or breaks.',
    icon: Sparkles,
    parameters: [
      { key: 'holiday_name', label: 'Holiday Name', sample: 'Diwali Break' },
      { key: 'start_date', label: 'Start Date', sample: '20 Oct 2026' },
    ],
    samplePreview: '🎉 *Strategic Mind Chess — Holiday Announcement*\n\nPlease note that regular batches will remain closed for *Diwali Break* starting from *20 Oct 2026*.\n\nEnjoy the festivities and keep solving chess puzzles!',
  },
  {
    name: 'smc_tournament',
    category: 'UTILITY',
    language: 'en',
    status: 'ACTIVE',
    description: 'Announcement and invite for weekly Sunday tournaments on Lichess.',
    icon: Trophy,
    parameters: [
      { key: 'tournament_name', label: 'Tournament Name', sample: 'SMC Sunday Rapid Arena' },
      { key: 'tournament_type', label: 'Format', sample: 'Rapid (10+0)' },
      { key: 'tournament_date', label: 'Tournament Date', sample: 'Sunday, 19 Oct' },
      { key: 'tournament_time', label: 'Tournament Time', sample: '10:00 AM IST' },
      { key: 'registration_link', label: 'Tournament Link', sample: 'https://lichess.org/tournament/smc2026' },
    ],
    samplePreview: '🏆 *Strategic Mind Chess — Weekly Tournament*\n\nGear up for *SMC Sunday Rapid Arena*!\n⚔️ *Format:* Rapid (10+0)\n📅 *Date:* Sunday, 19 Oct\n⏰ *Time:* 10:00 AM IST\n🔗 *Join Arena:* https://lichess.org/tournament/smc2026\n\nCompete, climb the leaderboard, and earn chocolate rewards!',
  },
  {
    name: 'smc_class_cancelled',
    category: 'UTILITY',
    language: 'en',
    status: 'ACTIVE',
    description: 'Emergency notice when a batch session has been called off by management or coach.',
    icon: AlertTriangle,
    parameters: [
      { key: 'batch_name', label: 'Batch Name', sample: 'Grandmasters A1' },
      { key: 'time', label: 'Scheduled Time', sample: '18 Oct at 04:00 PM' },
    ],
    samplePreview: '⚠️ *Strategic Mind Chess — Class Notice*\n\nPlease note that today’s class for batch *Grandmasters A1* scheduled for *18 Oct at 04:00 PM* has been cancelled. Management will inform you of the rescheduled slot shortly.',
  },
];

export function ActiveTemplatesView() {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDef>(TEMPLATES[0]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Meta App Configuration Summary Banner */}
      <Card className="p-6 bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900/90 border-purple-500/20 backdrop-blur-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-1.5 px-2.5 py-0.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Meta Cloud API Connected
              </Badge>
              <Badge variant="neutral" className="text-slate-400 border-slate-700 text-xs">
                WhatsApp Business Platform v21.0
              </Badge>
            </div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Meta WhatsApp Credentials & Configuration
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              All active templates below are registered and pre-approved under the <strong className="text-purple-300">UTILITY</strong> category, granting them exemption from ecosystem delivery blocks.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs shrink-0">
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 block mb-0.5 text-[10px] uppercase font-semibold">Display Phone</span>
              <span className="font-mono text-emerald-400 font-semibold">+91 8765926273</span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 block mb-0.5 text-[10px] uppercase font-semibold">Phone Number ID</span>
              <span className="font-mono text-slate-200">1392089087319898</span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 block mb-0.5 text-[10px] uppercase font-semibold">WABA Account ID</span>
              <span className="font-mono text-slate-200">1663021245172627</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Main 2-Column Template Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Template Cards List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" /> Pre-Approved Templates ({TEMPLATES.length})
            </h4>
            <span className="text-xs text-emerald-400 font-medium">All Live & Ready</span>
          </div>

          {TEMPLATES.map((tpl) => {
            const isSelected = selectedTemplate.name === tpl.name;
            const Icon = tpl.icon;

            return (
              <div
                key={tpl.name}
                onClick={() => setSelectedTemplate(tpl)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-purple-950/40 border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/30'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-mono text-sm font-bold text-white">{tpl.name}</h5>
                      <span className="text-xs text-slate-400 font-sans block mt-0.5 line-clamp-1">
                        {tpl.description}
                      </span>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] shrink-0">
                    {tpl.category}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-400">
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded text-slate-300">
                    Language: <strong className="text-white">{tpl.language}</strong>
                  </span>
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded text-slate-300">
                    {tpl.parameters.length} Variables
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Template Preview & Parameter Inspector */}
        <div className="lg:col-span-7">
          <Card className="p-6 bg-slate-900/80 border-slate-800 backdrop-blur-xl h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-mono text-lg font-bold text-white">{selectedTemplate.name}</h3>
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-xs">
                      {selectedTemplate.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400">{selectedTemplate.description}</p>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(selectedTemplate.name, selectedTemplate.name)}
                  className="text-xs border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300"
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  {copiedKey === selectedTemplate.name ? 'Copied!' : 'Copy Name'}
                </Button>
              </div>

              {/* Parameter Mapping Specification */}
              <div className="mb-6">
                <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-purple-400" /> Template Variables ({selectedTemplate.parameters.length})
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedTemplate.parameters.map((param, i) => (
                    <div key={param.key} className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                            {`{{${param.key}}}`}
                          </span>
                          <span className="text-xs text-slate-300 font-medium">{param.label}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                          Example: &ldquo;{param.sample}&rdquo;
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-600 font-mono">#{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* WhatsApp Mobile Mockup Preview */}
              <div>
                <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp Live Mockup Preview
                </h5>
                <div className="bg-[#0b141a] p-4 rounded-xl border border-slate-800/80 shadow-inner max-w-md mx-auto sm:mx-0">
                  <div className="bg-[#202c33] text-[#e9edef] rounded-2xl rounded-tl-sm p-3.5 shadow-md border border-[#222d34] text-xs leading-relaxed font-sans whitespace-pre-wrap">
                    {selectedTemplate.samplePreview}
                    <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-[#8696a0]">
                      <span>10:30 AM</span>
                      <CheckCircle2 className="w-3 h-3 text-[#53bdeb]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Info note */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
              <span>Ready for dispatch via Broadcast or Student Reminder modal.</span>
              <span className="text-emerald-400 font-mono text-[11px]">Meta Status: Approved</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
