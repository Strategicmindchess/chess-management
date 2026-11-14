"use client";

import { useState, useTransition } from "react";
import {
  updatePassportPrivacy,
  regeneratePassportSlug,
  PassportPrivacyInput,
} from "@/actions/passport/passport-actions";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Check,
  Copy,
  RefreshCw,
  ExternalLink,
  Lock,
  Globe,
  Sliders,
} from "lucide-react";

interface Props {
  initialSettings: {
    isPublicPassportEnabled: boolean;
    showRatings: boolean;
    showAchievements: boolean;
    showRatingProgress: boolean;
    showTournaments: boolean;
    showCertificates: boolean;
    showFideRating: boolean;
  };
  shareSlug: string;
  studentCode: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export function PassportPrivacySettingsDialog({
  initialSettings,
  shareSlug,
  studentCode,
  isOpen,
  onClose,
  onUpdated,
}: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [currentSlug, setCurrentSlug] = useState(shareSlug);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareableUrl = `${origin}/passport/${currentSlug}`;

  const handleToggle = (key: keyof PassportPrivacyInput) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  const handleSave = () => {
    setError(null);
    setSaveSuccess(false);
    startTransition(async () => {
      const res = await updatePassportPrivacy(settings);
      if (res.success) {
        setSaveSuccess(true);
        if (onUpdated) onUpdated();
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        setError(res.error || "Failed to save privacy settings");
      }
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    startTransition(async () => {
      const res = await regeneratePassportSlug();
      if (res.success && res.slug) {
        setCurrentSlug(res.slug);
      } else {
        setError(res.error || "Failed to regenerate link");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111723] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                Passport Privacy &amp; Sharing
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Control who can see your digital chess passport and what is visible.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {error && (
            <div className="p-3 text-xs rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
              {error}
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 text-xs rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2">
              <Check className="w-4 h-4" /> Privacy settings updated successfully!
            </div>
          )}

          {/* Master Public Toggle */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                {settings.isPublicPassportEnabled ? (
                  <Globe className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Lock className="w-4 h-4 text-amber-500" />
                )}
                <span className="font-semibold text-sm text-slate-900 dark:text-white">
                  Public Passport Sharing
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {settings.isPublicPassportEnabled
                  ? "Anyone with your link can view your permitted passport details."
                  : "Passport is private. Visitors will see a privacy notice."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleToggle("isPublicPassportEnabled")}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                settings.isPublicPassportEnabled ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  settings.isPublicPassportEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Shareable Link Box */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-amber-500" /> Shareable Passport Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareableUrl}
                className="flex-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-300 truncate focus:outline-hidden"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                className="shrink-0 flex items-center gap-1.5 text-xs font-medium"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isPending}
                className="hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Regenerate unique link
              </button>
              <a
                href={`/passport/${currentSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-brand-600 dark:hover:text-blue-400 flex items-center gap-1 font-medium"
              >
                Preview link <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Granular Field Visibility Controls */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Sliders className="w-3.5 h-3.5 text-amber-500" /> Field Visibility Controls
            </div>

            <div className="space-y-2.5">
              {[
                {
                  key: "showRatings",
                  title: "Show Online Ratings",
                  desc: "Chess.com & Lichess live ratings (Rapid, Blitz, Bullet, Puzzles).",
                },
                {
                  key: "showFideRating",
                  title: "Show FIDE Rating",
                  desc: "Official Standard FIDE rating and verification link.",
                },
                {
                  key: "showRatingProgress",
                  title: "Show Rating Progression Chart",
                  desc: "Historical rating progress graph over recent months.",
                },
                {
                  key: "showAchievements",
                  title: "Show Badges & Streaks",
                  desc: "Milestone badges, streak count, and leaderboard medals.",
                },
                {
                  key: "showCertificates",
                  title: "Show SMC Certificates",
                  desc: "Course completion and tournament certificates.",
                },
                {
                  key: "showTournaments",
                  title: "Show Tournament Records",
                  desc: "Weekly SMC tournament participation and scores.",
                },
              ].map((item) => {
                const isEnabled = !!settings[item.key as keyof typeof settings];
                return (
                  <div
                    key={item.key}
                    onClick={() => handleToggle(item.key as any)}
                    className="p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer flex items-center justify-between gap-3 transition-colors"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                        {isEnabled ? (
                          <Eye className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        {item.title}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => {}}
                      className="w-4 h-4 accent-amber-600 rounded-sm cursor-pointer"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300">
            <strong>Strict Privacy Guarantee:</strong> Personal contact info (phone, email, parent names), fee records, and private internal coach feedback notes are permanently hidden from all public views.
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isPending}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
          >
            {isPending ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </div>
    </div>
  );
}
