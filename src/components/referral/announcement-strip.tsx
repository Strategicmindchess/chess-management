'use client';

import Link from 'next/link';
import { ArrowRight, Gift } from 'lucide-react';

export function AnnouncementStrip() {
  const announcementText =
    '🎁 EARN WITH SMC | Refer 1 Chessmate – Get up to ₹500 cash reward | Refer 3 Chessmates – Get a smartwatch worth up to ₹2,500 | Refer 5 Chessmates – Get a smartwatch + cash reward up to ₹5,000.';

  return (
    <div
      role="region"
      aria-label="SMC Announcement"
      className="group relative z-20 flex h-10 w-full items-center overflow-hidden border-b border-[#873e09] bg-[#A94D0B] text-white shadow-sm select-none"
    >
      <style jsx>{`
        @keyframes smcMarqueeScroll {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-smc-marquee {
          display: flex;
          width: max-content;
          animation: smcMarqueeScroll 28s linear infinite;
        }
        .group:hover .animate-smc-marquee,
        .group:focus-within .animate-smc-marquee {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-smc-marquee {
            animation: none;
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      {/* Marquee Content Track */}
      <div className="animate-smc-marquee flex items-center whitespace-nowrap text-xs font-bold sm:text-sm">
        {/* Track Item 1 */}
        <div className="flex items-center gap-6 px-6">
          <span>{announcementText}</span>
          <Link
            href="/student/earn"
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-0.5 text-xs font-extrabold text-[#A94D0B] shadow-md transition-all hover:bg-amber-50 hover:scale-105 active:scale-95"
          >
            <span>Earn with SMC</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Track Item 2 (Duplicate for seamless loop) */}
        <div className="flex items-center gap-6 px-6" aria-hidden="true">
          <span>{announcementText}</span>
          <Link
            href="/student/earn"
            tabIndex={-1}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-0.5 text-xs font-extrabold text-[#A94D0B] shadow-md transition-all hover:bg-amber-50 hover:scale-105 active:scale-95"
          >
            <span>Earn with SMC</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

