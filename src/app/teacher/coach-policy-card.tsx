"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowRight, FileText } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

export function CoachPolicyCard() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="bg-emerald-50/80 pb-4 border-b border-emerald-100">
        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-emerald-600" />
          Compliance & Penalties
        </CardTitle>
        <CardDescription>
          View academy rules, compliance metrics, and penalty policy.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Button className="w-full flex items-center justify-between group bg-emerald-100 hover:bg-emerald-200 text-emerald-800 shadow-sm" onClick={() => setIsOpen(true)}>
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-600" />
            View Full Policy
          </span>
          <ArrowRight className="h-4 w-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
        </Button>

        <Dialog
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title="Compliance & Penalty Policy"
          description="Please read the following rules and regulations carefully. These policies ensure a high-quality learning environment for all students."
          className="sm:max-w-xl md:max-w-2xl"
        >
          <div className="space-y-8 pb-4">
            {/* 1. Late Joining */}
            <section>
              <h3 className="text-lg font-bold text-slate-900 mb-2 border-b pb-2">1. Late Joining / Link Sharing</h3>
              <p className="text-sm text-slate-600 mb-3">Coach joining time is automatically recorded through the website/portal.</p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex justify-between border-b pb-1"><span>0–2 minutes late:</span> <span className="font-medium text-emerald-600">No penalty</span></li>
                <li className="flex justify-between border-b pb-1"><span>2–5 minutes late:</span> <span className="font-medium text-rose-600">₹100</span></li>
                <li className="flex justify-between border-b pb-1"><span>5–10 minutes late:</span> <span className="font-medium text-rose-600">₹200</span></li>
                <li className="flex justify-between border-b pb-1"><span>More than 10 minutes late:</span> <span className="font-medium text-rose-600">₹500</span></li>
              </ul>
              <p className="text-xs text-slate-500 mt-2 italic">* No penalty if prior information is given to admin. Admin may edit or waive the penalty for a specific session.</p>
            </section>

            {/* 2. Camera Compliance */}
            <section>
              <h3 className="text-lg font-bold text-slate-900 mb-2 border-b pb-2">2. Camera Compliance</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
                <li>Camera must remain ON for the full duration of every session.</li>
                <li><span className="font-semibold text-rose-600">Camera OFF for more than 5 minutes:</span> ₹150 penalty per instance.</li>
                <li>Verification is done through the post-class student feedback form.</li>
              </ul>
            </section>

            {/* 3. Phone Usage */}
            <section>
              <h3 className="text-lg font-bold text-slate-900 mb-2 border-b pb-2">3. Phone Usage in Class</h3>
              <p className="text-sm text-slate-600 mb-3">Phone usage is tracked through the post-class student feedback form.</p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex justify-between border-b pb-1"><span>1st & 2nd instance:</span> <span className="font-medium text-emerald-600">No penalty</span></li>
                <li className="flex justify-between border-b pb-1"><span>3rd instance:</span> <span className="font-medium text-rose-600">₹250</span></li>
                <li className="flex justify-between border-b pb-1"><span>4th instance onwards:</span> <span className="font-medium text-rose-600">₹250 per instance</span></li>
              </ul>
            </section>

            {/* 4. Availability & Non-Performance */}
            <section>
              <h3 className="text-lg font-bold text-slate-900 mb-2 border-b pb-2">4. Availability & Non-Performance</h3>
              <p className="text-sm text-slate-600 mb-3">Escalating penalties apply for repeated instances of being unavailable to conduct sessions.</p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex justify-between border-b pb-1"><span>1st–2nd instance:</span> <span className="font-medium text-emerald-600">No penalty</span></li>
                <li className="flex justify-between border-b pb-1"><span>3rd instance:</span> <span className="font-medium text-rose-600">₹200</span></li>
                <li className="flex justify-between border-b pb-1"><span>4th instance:</span> <span className="font-medium text-rose-600">₹400</span></li>
                <li className="flex justify-between border-b pb-1"><span>5th instance:</span> <span className="font-medium text-rose-600">₹1,000</span></li>
                <li className="flex justify-between border-b pb-1"><span>6th instance:</span> <span className="font-medium text-rose-600">₹2,000</span></li>
                <li className="flex justify-between border-b pb-1"><span>7th instance:</span> <span className="font-medium text-rose-600">Suspension & payout review</span></li>
              </ul>
            </section>

            {/* 5. Rescheduling Policy */}
            <section>
              <h3 className="text-lg font-bold text-slate-900 mb-2 border-b pb-2">5. Rescheduling Policy</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm text-slate-800">Coach-Initiated Rescheduling</h4>
                  <ul className="space-y-1 text-sm text-slate-700 mt-2">
                    <li className="flex justify-between border-b pb-1"><span>First 3 instances:</span> <span className="font-medium text-emerald-600">No penalty</span></li>
                    <li className="flex justify-between border-b pb-1"><span>4th instance onwards:</span> <span className="font-medium text-rose-600">₹100 per instance</span></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-800">Parent-Initiated Rescheduling</h4>
                  <p className="text-sm text-emerald-600 font-medium">No penalty, regardless of number of instances.</p>
                </div>
              </div>
            </section>

            {/* 6. Uninformed Absence */}
            <section>
              <h3 className="text-lg font-bold text-slate-900 mb-2 border-b pb-2">6. Uninformed Absence</h3>
              <p className="text-sm text-slate-600 mb-3">Failure to conduct a session without prior notice or approval:</p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex justify-between border-b pb-1"><span>1st instance:</span> <span className="font-medium text-rose-600">2× session fee deduction</span></li>
                <li className="flex justify-between border-b pb-1"><span>2nd instance:</span> <span className="font-medium text-rose-600">3× session fee deduction</span></li>
                <li className="flex justify-between border-b pb-1"><span>3rd instance:</span> <span className="font-medium text-rose-600">5× session fee deduction</span></li>
                <li className="flex justify-between border-b pb-1"><span>4th instance:</span> <span className="font-bold text-rose-700">Termination of engagement</span></li>
              </ul>
            </section>

            {/* 7. Waivers */}
            <section>
              <h3 className="text-lg font-bold text-slate-900 mb-2 border-b pb-2">7. Waivers & Emergency Exceptions</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
                <li>Genuine emergencies can be considered for penalty waiver.</li>
                <li>Valid proof may be required.</li>
                <li>Final decision rests with the company/admin.</li>
                <li>Admin may adjust or waive penalties for a specific session.</li>
              </ul>
            </section>

            {/* 8. Code of Conduct */}
            <section>
              <h3 className="text-lg font-bold text-slate-900 mb-2 border-b pb-2">8. Code of Conduct</h3>
              <div className="space-y-4 text-sm text-slate-700">
                <div>
                  <h4 className="font-semibold text-slate-800">Confidentiality</h4>
                  <p>Do not share student data, materials or pricing with anyone outside the company.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800">Professional Behaviour</h4>
                  <p>Maintain respectful and professional conduct at all times.</p>
                </div>
                <div className="bg-rose-50 p-3 rounded-lg border border-rose-100">
                  <h4 className="font-bold text-rose-800 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    Non-Solicitation
                  </h4>
                  <p className="mt-1 font-medium text-rose-700">Coaches must not take SMC students privately outside the SMC platform. Violation may lead to termination and a penalty of up to ₹25,000.</p>
                </div>
              </div>
            </section>
          </div>
        </Dialog>
      </CardContent>
    </Card>
  );
}
