'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Share2, MessageCircle, Gift, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReferralHeroCardProps {
  referralCode: string;
  shareableUrl: string;
}

export function ReferralHeroCard({ referralCode, shareableUrl }: ReferralHeroCardProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [effectiveUrl, setEffectiveUrl] = useState(shareableUrl);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEffectiveUrl(`${window.location.origin}/signup?ref=${referralCode}`);
    }
  }, [referralCode]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(effectiveUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const shareText = `♟ Join Strategic Mind Chess with my referral code ${referralCode}! Get world-class coaching & tournaments. Register here: ${effectiveUrl}`;

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Join Strategic Mind Chess',
          text: shareText,
          url: effectiveUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  const handleWhatsAppShare = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-orange-50/40 p-6 shadow-sm dark:border-amber-900/30 dark:from-[#1c1917]/70 dark:via-[#161413] dark:to-[#1a1410]">
      {/* Background chess accent glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 -bottom-10 h-44 w-44 rounded-full bg-[#A94D0B]/10 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Headline & Description */}
        <div className="max-w-xl space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100/80 px-3 py-1 text-xs font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <Gift className="h-3.5 w-3.5 text-[#A94D0B] dark:text-amber-400" />
            <span>Referral Program</span>
            <Sparkles className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Earn with SMC
          </h1>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Invite fellow chess enthusiasts to join Strategic Mind Chess. Unlock cash rewards and smartwatches as your friends join active batches and complete their training!
          </p>
        </div>

        {/* Right: Code & Sharing CTAs */}
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
          {/* Permanent Code Card */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 p-2.5 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/90">
            <div className="px-3 text-left">
              <span className="block text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                Your Referral Code
              </span>
              <span className="font-mono text-lg font-black tracking-widest text-[#A94D0B] dark:text-amber-400">
                {referralCode}
              </span>
            </div>
            <button
              onClick={handleCopyCode}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              title="Copy Referral Code"
            >
              {copiedCode ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>

          {/* Share Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleCopyLink}
              variant="secondary"
              size="sm"
              className="border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              {copiedLink ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                  Link Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy Link
                </>
              )}
            </Button>

            <Button
              onClick={handleWhatsAppShare}
              size="sm"
              className="bg-emerald-600 font-medium text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800"
            >
              <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
              WhatsApp
            </Button>

            <Button
              onClick={handleNativeShare}
              variant="gradient"
              size="sm"
              className="font-medium"
            >
              <Share2 className="mr-1.5 h-3.5 w-3.5" />
              Share
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

