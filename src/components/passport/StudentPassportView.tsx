"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  StudentPassportData,
  PassportRatingCard,
  PassportBadge,
} from "@/services/passport/passport.service";
import {
  syncStudentPassportRatings,
  updatePassportBio,
} from "@/actions/passport/passport-actions";
import { PassportPrivacySettingsDialog } from "./PassportPrivacySettingsDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Award,
  Crown,
  Flame,
  Zap,
  Target,
  Shield,
  ShieldCheck,
  Globe,
  Lock,
  Swords,
  Calendar,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Share2,
  Check,
  Copy,
  Edit3,
  Download,
  CheckCircle2,
  TrendingUp,
  User,
  GraduationCap,
  Medal,
  Gift,
  HelpCircle,
  FileCheck,
} from "lucide-react";

interface Props {
  passport: StudentPassportData;
  isOwner?: boolean;
  isAdmin?: boolean;
  isCoach?: boolean;
}

export function StudentPassportView({
  passport,
  isOwner = false,
  isAdmin = false,
  isCoach = false,
}: Props) {
  const [data, setData] = useState(passport);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState(data.bio || "");
  const [fideIdInput, setFideIdInput] = useState(data.chessAccounts.fideId || "");
  const [fideRatingInput, setFideRatingInput] = useState(
    data.chessAccounts.fideRating ? String(data.chessAccounts.fideRating) : ""
  );
  const [isPending, startTransition] = useTransition();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const canEdit = isOwner || isAdmin;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicShareUrl = `${origin}/passport/${data.shareSlug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicShareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSyncRatings = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await syncStudentPassportRatings(data.id);
      if (res.success) {
        setSyncMessage(res.message || "Live ratings updated!");
        setTimeout(() => setSyncMessage(null), 3000);
      } else {
        setSyncMessage(res.error || "Sync failed");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveBio = () => {
    startTransition(async () => {
      const ratingNum = fideRatingInput ? parseInt(fideRatingInput, 10) : undefined;
      const res = await updatePassportBio({
        bio: bioInput,
        fideId: fideIdInput,
        fideRating: isNaN(ratingNum as any) ? undefined : ratingNum,
      });
      if (res.success) {
        setData((prev) => ({
          ...prev,
          bio: bioInput,
          chessAccounts: {
            ...prev.chessAccounts,
            fideId: fideIdInput || null,
            fideRating: ratingNum || null,
          },
        }));
        setIsEditingBio(false);
      }
    });
  };

  // If passport is private and viewer is not owner/admin/coach
  if (data.isPrivate) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white dark:bg-[#111723] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          This SMC Student Passport is Private
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          The student or their guardian has enabled privacy protection on this profile.
          Public rating and achievement statistics are currently hidden.
        </p>
        <div className="pt-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Strategic Mind Chess Verified Student
          </span>
        </div>
      </div>
    );
  }

  // Format level label
  const formatLevel = (lvl: string | null) => {
    if (!lvl) return "Foundation";
    return lvl.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Badge icon helper
  const renderBadgeIcon = (icon: string) => {
    switch (icon) {
      case "flame":
        return <Flame className="w-5 h-5 text-orange-500" />;
      case "zap":
        return <Zap className="w-5 h-5 text-amber-500" />;
      case "crown":
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case "target":
        return <Target className="w-5 h-5 text-emerald-500" />;
      case "shield":
        return <Shield className="w-5 h-5 text-blue-500" />;
      case "sparkles":
        return <Sparkles className="w-5 h-5 text-purple-500" />;
      case "gift":
        return <Gift className="w-5 h-5 text-pink-500" />;
      case "swords":
        return <Swords className="w-5 h-5 text-indigo-500" />;
      case "trophy":
        return <Trophy className="w-5 h-5 text-amber-500" />;
      case "medal":
        return <Medal className="w-5 h-5 text-cyan-500" />;
      default:
        return <Award className="w-5 h-5 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* ── PASSPORT HERO CARD ── */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-[#101524] to-[#1c1917] text-white p-6 md:p-8 border border-amber-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Decorative Golden Ambient Gradients & Chess Watermark */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-[90px] pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />
        
        {/* Subtle Watermark */}
        <div className="absolute right-6 bottom-4 opacity-5 pointer-events-none text-9xl font-black select-none tracking-tighter">
          ♟ SMC
        </div>

        {/* Top Bar of Passport */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-amber-500/30">
              ♟
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-amber-400 flex items-center gap-1.5">
                Official Digital Chess Passport
              </div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Strategic Mind Chess
              </h2>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {canEdit && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsPrivacyOpen(true)}
                className="bg-white/5 hover:bg-white/10 border-white/15 text-white text-xs font-semibold backdrop-blur-md gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" /> Privacy &amp; Sharing
              </Button>
            )}

            {canEdit && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSyncRatings}
                disabled={isSyncing}
                className="bg-white/5 hover:bg-white/10 border-white/15 text-white text-xs font-semibold backdrop-blur-md gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing..." : "Sync Ratings"}
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyLink}
              className="bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-300 text-xs font-bold backdrop-blur-md gap-1.5 shadow-xs"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              {copiedLink ? "Link Copied!" : "Share Passport"}
            </Button>
          </div>
        </div>

        {syncMessage && (
          <div className="mt-4 p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> {syncMessage}
          </div>
        )}

        {/* Passport Identity Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-6 relative z-10 items-center">
          {/* Avatar & Verification Seal */}
          <div className="md:col-span-3 flex flex-col items-center sm:items-start md:items-center text-center">
            <div className="relative group">
              <div className="w-32 h-32 rounded-3xl overflow-hidden border-2 border-amber-400/80 bg-slate-800 shadow-xl shadow-black/50 relative">
                {data.profilePictureUrl ? (
                  <Image
                    src={data.profilePictureUrl}
                    alt={data.name}
                    width={128}
                    height={128}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-slate-400 font-bold text-4xl">
                    {data.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-1.5 rounded-xl shadow-lg border-2 border-slate-900" title="Verified SMC Student">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3 font-mono text-[11px] font-bold tracking-widest text-amber-400/90 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
              {data.studentCode}
            </div>
          </div>

          {/* Student Info & Level Details */}
          <div className="md:col-span-6 space-y-3 text-center sm:text-left">
            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-bold tracking-wide uppercase">
                  {formatLevel(data.level)}
                </span>
                {data.batch && (
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-semibold">
                    Batch: {data.batch.name} ({data.batch.code})
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                {data.name}
              </h1>
            </div>

            {/* Chess Bio / Motto */}
            {isEditingBio ? (
              <div className="space-y-2 pt-2 bg-slate-900/80 p-3 rounded-xl border border-white/10">
                <textarea
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  placeholder="Enter your chess motto or goals (e.g. 'Aspiring 1500+ rated player | Sicilian Defense enthusiast')..."
                  className="w-full text-xs bg-slate-800 text-white rounded-lg p-2 border border-slate-700 focus:outline-hidden focus:border-amber-400 resize-none h-16"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={fideIdInput}
                    onChange={(e) => setFideIdInput(e.target.value)}
                    placeholder="FIDE ID (optional)"
                    className="text-xs bg-slate-800 text-white rounded-lg p-2 border border-slate-700"
                  />
                  <input
                    type="number"
                    value={fideRatingInput}
                    onChange={(e) => setFideRatingInput(e.target.value)}
                    placeholder="FIDE Rating"
                    className="text-xs bg-slate-800 text-white rounded-lg p-2 border border-slate-700"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingBio(false)} className="text-xs text-slate-300">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveBio} disabled={isPending} className="text-xs bg-amber-600 hover:bg-amber-700 text-white">
                    Save Bio
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 group">
                <p className="text-sm text-slate-300 italic leading-relaxed">
                  {data.bio ? `"${data.bio}"` : "Dedicated Strategic Mind Chess student training for competitive excellence."}
                </p>
                {canEdit && (
                  <button
                    onClick={() => setIsEditingBio(true)}
                    className="opacity-60 hover:opacity-100 text-amber-400 p-1 transition-opacity shrink-0"
                    title="Edit Bio & FIDE"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Academic Meta Info */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-y-2 gap-x-4 text-xs text-slate-400 pt-1">
              {data.coach && (
                <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                  <GraduationCap className="w-4 h-4 text-amber-400" />
                  Coach: {data.coach.name} {data.coach.city ? `(${data.coach.city})` : ""}
                </div>
              )}
              {data.joiningDate && (
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Joined: {data.joiningDate}
                </div>
              )}
            </div>
          </div>

          {/* Peak Rating & Streak Highlights */}
          <div className="md:col-span-3 flex flex-col gap-3">
            {/* Peak Rating Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/40 backdrop-blur-md">
              <div className="flex items-center justify-between text-amber-300 text-xs font-bold uppercase tracking-wider mb-1">
                <span className="flex items-center gap-1">
                  <Crown className="w-4 h-4 text-amber-400" /> Peak Rating
                </span>
                <span className="text-[10px] bg-amber-400/20 px-1.5 py-0.5 rounded-sm font-semibold">
                  {data.peakRating.platform || "Online"}
                </span>
              </div>
              <div className="text-3xl font-black text-amber-200">
                {data.peakRating.rating || "—"}
              </div>
              <div className="text-[11px] text-amber-300/80 mt-0.5">
                {data.peakRating.format || "Rapid"} Format
                {data.peakRating.date ? ` • ${data.peakRating.date.split("T")[0]}` : ""}
              </div>
            </div>

            {/* Active Streak */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Training Streak
                  </div>
                  <div className="text-lg font-black text-white">
                    {data.streakDays} Days
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400">Tactics Solved</div>
                <div className="text-sm font-bold text-emerald-400">
                  {data.puzzleStats.solved} ({data.puzzleStats.accuracy}%)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Linked Accounts Bar */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-400">Connected Platforms:</span>

            {/* Chess.com */}
            {data.chessAccounts.chessComUsername ? (
              <a
                href={data.chessAccounts.chessComUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold hover:bg-emerald-500/20 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Chess.com: {data.chessAccounts.chessComUsername}
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 text-[11px]">
                Chess.com: Not Linked
              </span>
            )}

            {/* Lichess */}
            {data.chessAccounts.lichessUsername ? (
              <a
                href={data.chessAccounts.lichessUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 font-semibold hover:bg-blue-500/20 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                Lichess: {data.chessAccounts.lichessUsername}
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 text-[11px]">
                Lichess: Not Linked
              </span>
            )}

            {/* FIDE */}
            {data.chessAccounts.fideRating ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold">
                <Crown className="w-3 h-3 text-amber-400" />
                FIDE Standard: {data.chessAccounts.fideRating}
                {data.chessAccounts.fideId ? ` (ID: ${data.chessAccounts.fideId})` : ""}
              </span>
            ) : null}
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> SMC Digital Identity Protocol
          </div>
        </div>
      </div>

      {/* ── RATINGS BREAKDOWN ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Verified Ratings &amp; Format Performance
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Auto-synced from official API endpoints
          </span>
        </div>

        {data.ratings.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-[#111723] border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-500">
            No live ratings detected yet. Link your Chess.com or Lichess account to populate ratings automatically.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.ratings.map((card, idx) => {
              const isFide = card.platform === "FIDE";
              const isChessCom = card.platform === "Chess.com";
              return (
                <div
                  key={`${card.platform}-${card.format}-${idx}`}
                  className={`rounded-2xl p-5 border transition-all duration-300 bg-white dark:bg-[#111723] hover:shadow-lg ${
                    isFide
                      ? "border-amber-400/70 bg-gradient-to-br from-amber-50/50 dark:from-amber-950/20 to-transparent"
                      : isChessCom
                      ? "border-emerald-200/80 dark:border-emerald-900/40 hover:border-emerald-400"
                      : "border-blue-200/80 dark:border-blue-900/40 hover:border-blue-400"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isFide
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
                          : isChessCom
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300"
                      }`}
                    >
                      {card.platform}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {card.format}
                    </span>
                  </div>

                  <div className="text-3xl font-black text-slate-900 dark:text-white">
                    {card.rating}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>
                      {card.gamesPlayed ? `${card.gamesPlayed} games` : "Verified rating"}
                    </span>
                    {card.sourceUrl && (
                      <a
                        href={card.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1 font-medium"
                      >
                        Profile <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── RATING PROGRESSION GRAPH ── */}
      {data.ratingHistory.length > 0 && (
        <div className="rounded-3xl bg-white dark:bg-[#111723] border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Historical Rating Progression
              </h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Month-over-month trajectory
            </span>
          </div>

          {/* Clean SVG Trend Chart */}
          <div className="h-44 w-full relative pt-4">
            {(() => {
              const points = data.ratingHistory;
              const ratingsArr = points.map((p) => p.rating);
              const min = Math.min(...ratingsArr) - 40;
              const max = Math.max(...ratingsArr) + 40;
              const range = Math.max(max - min, 1);
              const width = 800;
              const height = 140;

              const coordinates = points.map((p, i) => {
                const x = (i / Math.max(points.length - 1, 1)) * (width - 60) + 30;
                const y = height - ((p.rating - min) / range) * (height - 30) - 15;
                return { x, y, rating: p.rating, date: p.date, platform: p.platform };
              });

              const pathD = coordinates.reduce((acc, curr, idx) => {
                return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
              }, "");

              const areaD = `${pathD} L ${coordinates[coordinates.length - 1].x} ${height} L ${coordinates[0].x} ${height} Z`;

              return (
                <div className="w-full h-full flex flex-col justify-between">
                  <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-32 overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="passportRatingGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Fill Area */}
                    <path d={areaD} fill="url(#passportRatingGrad)" />
                    {/* Stroke Line */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    {/* Points */}
                    {coordinates.map((pt, idx) => (
                      <g key={idx} className="group cursor-pointer">
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="5"
                          className="fill-white dark:fill-[#111723] stroke-amber-500 stroke-[3px] transition-transform duration-200 group-hover:scale-125"
                        />
                        <text
                          x={pt.x}
                          y={pt.y - 12}
                          textAnchor="middle"
                          className="text-[10px] font-bold fill-slate-700 dark:fill-slate-300 font-mono"
                        >
                          {pt.rating}
                        </text>
                      </g>
                    ))}
                  </svg>

                  {/* Dates Axis */}
                  <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {points.map((p, i) => (
                      <span key={i}>{p.date}</span>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── ACHIEVEMENTS & BADGES CABINET ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Achievements, Badges &amp; Honors
            </h3>
          </div>
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            {data.badges.length} Badges Unlocked
          </span>
        </div>

        {data.badges.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-[#111723] border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-500">
            Complete daily practice streaks, classroom challenges, and tournaments to earn badges.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {data.badges.map((badge) => (
              <div
                key={badge.id}
                className="rounded-2xl p-4 bg-white dark:bg-[#111723] border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-start gap-3.5 hover:border-amber-400/50 transition-colors"
              >
                <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 flex items-center justify-center shrink-0 shadow-xs">
                  {renderBadgeIcon(badge.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {badge.title}
                    </h4>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {badge.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {badge.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── VERIFIED SMC CERTIFICATES ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Official Certificates &amp; Milestones
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Issued by Strategic Mind Chess Academic Board
          </span>
        </div>

        {data.certificates.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-[#111723] border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-500">
            No certificates awarded yet. Certificates are issued upon course level completion or tournament victories.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.certificates.map((cert) => (
              <div
                key={cert.id}
                className="rounded-2xl p-5 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 dark:from-[#131722] dark:to-[#1a1c23] border-2 border-amber-400/50 shadow-md relative overflow-hidden flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                      {cert.category.replace(/_/g, " ")}
                    </span>
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white mt-1.5">
                      {cert.title}
                    </h4>
                  </div>
                  <Award className="w-8 h-8 text-amber-500 shrink-0" />
                </div>

                {cert.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                    {cert.description}
                  </p>
                )}

                <div className="pt-3 border-t border-amber-200/60 dark:border-amber-500/20 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                      ID: {cert.certificateNumber}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                      Date: {cert.issueDate}
                    </div>
                  </div>

                  {cert.certificateUrl ? (
                    <a
                      href={cert.certificateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified Credential
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── TOURNAMENTS & COMPETITIVE RECORD ── */}
      {data.tournaments.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Tournament Record &amp; Competition
              </h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Weekly SMC Arena Performance
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111723] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Tournament Score</th>
                    <th className="p-3.5">Participation</th>
                    <th className="p-3.5">Sportsmanship</th>
                    <th className="p-3.5">Coach Evaluation Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  {data.tournaments.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      <td className="p-3.5 font-medium">{t.tournamentDate}</td>
                      <td className="p-3.5">
                        <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                          {t.score} / 100
                        </span>
                      </td>
                      <td className="p-3.5">{t.participation ?? "—"}</td>
                      <td className="p-3.5">{t.sportsmanship ?? "—"}</td>
                      <td className="p-3.5 text-slate-500 dark:text-slate-400">
                        {t.notes || "Good tactical play and sportsman spirit."}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── LEADERBOARD AWARDS & PODIUM FINISHES ── */}
      {data.leaderboardHighlights.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Medal className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Leaderboard History &amp; Monthly Rewards
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {data.leaderboardHighlights.map((lh, idx) => (
              <div
                key={idx}
                className="rounded-2xl p-4 bg-white dark:bg-[#111723] border border-slate-200 dark:border-slate-800 shadow-xs"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <span>{lh.month}</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {lh.points} Points
                  </span>
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white">
                  {lh.rank ? `Rank #${lh.rank}` : "Participant"}
                </div>
                {lh.rewards.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5 text-amber-500" /> {lh.rewards.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Privacy Dialog */}
      <PassportPrivacySettingsDialog
        initialSettings={data.privacySettings}
        shareSlug={data.shareSlug}
        studentCode={data.studentCode}
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
        onUpdated={() => {}}
      />
    </div>
  );
}
