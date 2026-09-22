"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Thin top-of-screen progress bar that animates on every route change.
 * Works with Next.js App Router — triggers whenever `pathname` changes.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const completeRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (completeRef.current) clearTimeout(completeRef.current);
  };

  useEffect(() => {
    // Start progress bar on path change
    setVisible(true);
    setWidth(0);

    // Quickly jump to 20% then increment slowly
    setTimeout(() => setWidth(20), 50);

    timerRef.current = setInterval(() => {
      setWidth((w) => {
        if (w >= 90) {
          clearInterval(timerRef.current!);
          return 90;
        }
        // Gradually slow down as it approaches 90%
        const increment = w < 40 ? 8 : w < 70 ? 4 : 1;
        return Math.min(w + increment, 90);
      });
    }, 100);

    // Complete after a short delay (simulates page ready)
    completeRef.current = setTimeout(() => {
      clearInterval(timerRef.current!);
      setWidth(100);
      // Fade out after completion
      setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 400);
    }, 500);

    return clearTimers;
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-label="Page loading"
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
    >
      <div
        className="h-full bg-gradient-to-r from-brand-400 via-brand-500 to-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.6)] transition-all duration-300 ease-out"
        style={{ width: `${width}%` }}
      />
      {/* Glow dot at the end */}
      <div
        className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-brand-400 shadow-[0_0_8px_4px_rgba(234,179,8,0.5)] transition-all duration-300 ease-out"
        style={{ left: `calc(${width}% - 6px)` }}
      />
    </div>
  );
}
