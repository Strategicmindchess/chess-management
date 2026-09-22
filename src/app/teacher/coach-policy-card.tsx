"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowRight, FileText } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

// ── Shared policy content ─────────────────────────────────────────────────────
export function PolicyContent() {
  return (
    <div className="space-y-8 pb-4">
      {/* 1. Late Joining */}
      <section>
        <h3 className="text-lg font-bold text-white mb-2 border-b border-slate-700 pb-2">1. Late Joining / Link Sharing</h3>
        <p className="text-sm text-slate-400 mb-3">Coach joining time is automatically recorded through the website/portal.</p>
        <ul className="space-y-2 text-sm">
          <li className="flex justify-between border-b border-slate-700/50 pb-1"><span className="text-slate-300">0–2 minutes late:</span> <span className="font-medium text-emerald-400">No penalty</span></li>
          <li className="flex justify-between border-b border-slate-700/50 pb-1"><span className="text-slate-300">2–5 minutes late:</span> <span className="font-medium text-rose-400">₹100</span></li>
          <li className="flex justify-between border-b border-slate-700/50 pb-1"><span className="text-slate-300">5–10 minutes late:</span> <span className="font-medium text-rose-400">₹200</span></li>
          <li className="flex justify-between border-b border-slate-700/50 pb-1"><span className="text-slate-300">More than 10 minutes late:</span> <span className="font-medium text-rose-400">₹500</span></li>
        </ul>
        <p className="text-xs text-slate-500 mt-2 italic">* No penalty if prior information is given to admin. Admin may edit or waive the penalty for a specific session.</p>
      </section>

      {/* 2. Camera Compliance */}
      <section>
        <h3 className="text-lg font-bold text-white mb-2 border-b border-slate-700 pb-2">2. Camera Compliance</h3>
        <ul className="list-disc pl-5 space-y-2 text-sm text-slate-300">
          <li>Camera must remain ON for the full duration of every session.</li>
          <li><span className="font-semibold text-rose-400">Camera OFF for more than 5 minutes:</span> ₹150 penalty per instance.</li>
          <li>Verification is done through the post-class student feedback form.</li>
        </ul>
      </section>

      {/* 3. Phone Usage */}
      <section>
        <h3 className="text-lg font-bold text-white mb-2 border-b border-slate-700 pb-2">3. Phone Usage in Class</h3>
        <p className="text-sm text-slate-400 mb-3">Phone usage is tracked through the post-class student feedback form.</p>
        <ul className="space-y-2 text-sm">
          <li className="flex justify-between border-b border-slate-700/50 pb-1"><span className="text-slate-300">1st &amp; 2nd instance:</span> <span className="font-medium text-emerald-400">No penalty</span></li>
          <li className="flex justify-between border-b border-slate-700/50 pb-1"><span className="text-slate-300">3rd instance:</span> <span className="font-medium text-rose-400">₹250</span></li>
          <li className="flex justify-between border-b border-slate-700/50 pb-1"><span className="text-slate-300">4th instance onwards:</span> <span className="font-medium text-rose-400">₹250 per instance</span></li>
        </ul>
      </section>

      {/* 4. Availability & Non-Performance */}
      <section>
        <h3 className="text-lg font-bold text-white mb-2 border-b border-slate-700 pb-2">4. Availability &amp; Non-Performance</h3>
        <p className="text-sm text-slate-400 mb-3">Escalating penalties apply for repeated instances of being unavailable to conduct sessions.</p>
        <ul className="space-y-2 text-sm">
          <li className="flex justify-between border-b border-slate-700/50 pb-1"><span className="text-slate-300">1st–2nd instance:</span> <span className="font-medium text-emerald-400">No penalty</span></li>
          <li className="flex justify-between border-b border-slate-700/50 pb-1"><span className="text-slate-300">3rd instance:</span> <span className="font-medium text-rose-400">₹200</span></li>
          <li className="flex justify-between border-b border-slate-700/50 pb-1"><span className="text-slate-300">4th instance:</span> <span className="font-medium text-rose-400">₹400</span></li>
          <li className="flex justify-between border-b border-slate-700/50 pb-1"><span className="text-slate-300">5th instance:</span> <span className="font-medium text-rose-400">₹1,000</span></li>
          <li className="flex justify-between border-b border-slate-700/50 pb-1"><span className="text-slate-300">6th instance:</span> <span className="font-medium text-rose-400">₹2,000</span></li>
          <li className="flex justify-between border-b border-slate-700/50 pb-1"><span className="text-slate-300">7th instance:</span> <span className="font-bold text-rose-500">Suspension &amp; payout review</span></li>
        </ul>
      </section>

      {/* 5. Rescheduling Policy */}
      <section>
        <h3 className="text-lg font-bold text-white mb-2 border-b border-slate-700 pb-2">5. Rescheduling Policy</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm text-slate-200">Coach-Initiated Rescheduling</h4>
            <ul className="space-y-1 text-sm mt-2">
              <li className="flex justify-between border-b border-slate-700/50 pb-1"><span className="text-slate-300">First 3 instances:</span> <span className="font-medium text-emerald-400">No penalty</span></li>
              <li className="flex justify-between border-b border-slate-700/50 pb-1"><span className="text-slate-300">4th instance onwards:</span> <span className="font-medium text-rose-400">₹100 per instance</span></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-slate-200">Parent-Initiated Rescheduling</h4>
            <p className="text-sm text-emerald-400 font-medium">No penalty, regardless of number of instances.</p>
          </div>
        </div>
      </section>

      {/* 6. Uninformed Absence */}
      <section>
        <h3 className="text-lg font-bold text-white mb-2 border-b border-slate-700 pb-2">6. Uninformed Absence</h3>
        <p className="text-sm text-slate-400 mb-3">Failure to conduct a session without prior notice or approval:</p>
        <ul className="space-y-2 text-sm">
          <li className="flex justify-between border-b border-slate-700/50 pb-1"><span className="text-slate-300">1st instance:</span> <span className="font-medium text-rose-400">2× session fee deduction</span></li>
          <li className="flex justify-between border-b border-slate-700/50 pb-1"><span className="text-slate-300">2nd instance:</span> <span className="font-medium text-rose-400">3× session fee deduction</span></li>
          <li className="flex justify-between border-b border-slate-700/50 pb-1"><span className="text-slate-300">3rd instance:</span> <span className="font-medium text-rose-400">5× session fee deduction</span></li>
          <li className="flex justify-between border-b border-slate-700/50 pb-1"><span className="text-slate-300">4th instance:</span> <span className="font-bold text-rose-500">Termination of engagement</span></li>
        </ul>
      </section>

      {/* 7. Waivers */}
      <section>
        <h3 className="text-lg font-bold text-white mb-2 border-b border-slate-700 pb-2">7. Waivers &amp; Emergency Exceptions</h3>
        <ul className="list-disc pl-5 space-y-2 text-sm text-slate-300">
          <li>Genuine emergencies can be considered for penalty waiver.</li>
          <li>Valid proof may be required.</li>
          <li>Final decision rests with the company/admin.</li>
          <li>Admin may adjust or waive penalties for a specific session.</li>
        </ul>
      </section>

      {/* 8. Code of Conduct */}
      <section>
        <h3 className="text-lg font-bold text-white mb-2 border-b border-slate-700 pb-2">8. Code of Conduct</h3>
        <div className="space-y-4 text-sm text-slate-300">
          <div>
            <h4 className="font-semibold text-slate-200">Confidentiality</h4>
            <p>Do not share student data, materials or pricing with anyone outside the company.</p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-200">Professional Behaviour</h4>
            <p>Maintain respectful and professional conduct at all times.</p>
          </div>
          <div className="bg-rose-500/10 p-4 rounded-xl border border-rose-500/20">
            <h4 className="font-bold text-rose-400 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Non-Solicitation
            </h4>
            <p className="mt-1 font-medium text-rose-300">Coaches must not take SMC students privately outside the SMC platform. Violation may lead to termination and a penalty of up to ₹25,000.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Card variant (dashboard widget with dialog) ───────────────────────────────
export function CoachPolicyCard() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="group relative rounded-2xl bg-[#111723]/80 backdrop-blur-xl border border-blue-500/20 p-5 overflow-hidden hover:border-blue-500/50 transition-colors shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[30px] -mr-10 -mt-10 pointer-events-none" />
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
          <ShieldAlert className="w-5 h-5 text-blue-400" />
        </div>
      </div>
      <p className="text-sm text-slate-400 font-medium mb-1">Compliance &amp; Penalties</p>
      <Button
        size="sm"
        className="mt-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 hover:text-blue-300"
        onClick={() => setIsOpen(true)}
      >
        <FileText className="w-4 h-4 mr-2" />
        View Policy
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>

      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Compliance & Penalty Policy"
        description="Please read the following rules and regulations carefully."
        className="sm:max-w-xl md:max-w-2xl"
      >
        <PolicyContent />
      </Dialog>
    </div>
  );
}
