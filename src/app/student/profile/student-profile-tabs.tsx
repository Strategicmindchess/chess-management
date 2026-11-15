"use client";

import { useState } from "react";
import { StudentPassportData } from "@/services/passport/passport.service";
import { StudentPassportView } from "@/components/passport/StudentPassportView";
import { ProfileForm } from "@/app/account/profile/profile-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ShieldCheck, UserCheck, Settings, Sparkles } from "lucide-react";

interface Props {
  passport: StudentPassportData;
  userWithProfile: any;
}

export function StudentProfileTabs({ passport, userWithProfile }: Props) {
  const [activeTab, setActiveTab] = useState<"passport" | "settings">("passport");

  return (
    <div className="space-y-6">
      {/* Navigation Pill Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white dark:bg-[#111723] p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("passport")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "passport"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>♟</span> Digital Chess Passport
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "settings"
                ? "bg-white dark:bg-[#1a2030] text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Settings className="w-3.5 h-3.5" /> Account Details &amp; Settings
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 px-3 hidden sm:flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>SMC ID: <strong className="font-mono text-slate-900 dark:text-white">{passport.studentCode}</strong></span>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "passport" ? (
        <StudentPassportView passport={passport} isOwner={true} />
      ) : (
        <div className="max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Profile Details &amp; Account Settings</CardTitle>
              <CardDescription>
                Update your personal information, profile photo, and chess credentials below. Your email address is protected.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm user={userWithProfile} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
