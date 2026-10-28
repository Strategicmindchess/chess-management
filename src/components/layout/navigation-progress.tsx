"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * NavigationProgress:
 * 1. Instantly starts animating the moment any internal link or button is clicked (0ms delay).
 * 2. Displays a glowing top progress bar + sleek loading pill so the screen never feels frozen.
 * 3. Completes and smoothly disappears once the new page loads.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const completeRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (completeRef.current) clearTimeout(completeRef.current);
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
  }, []);

  const startProgress = useCallback(() => {
    clearTimers();
    setVisible(true);
    setWidth(25);

    timerRef.current = setInterval(() => {
      setWidth((w) => {
        if (w >= 90) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 90;
        }
        const increment = w < 50 ? 10 : w < 75 ? 4 : 1;
        return Math.min(w + increment, 90);
      });
    }, 100);

    // Safety timeout: if page doesn't change in 8s, reset
    safetyTimeoutRef.current = setTimeout(() => {
      clearTimers();
      setVisible(false);
      setWidth(0);
    }, 8000);
  }, [clearTimers]);

  const finishProgress = useCallback(() => {
    clearTimers();
    setWidth(100);
    completeRef.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 250);
  }, [clearTimers]);

  // When pathname changes (route transition completed)
  useEffect(() => {
    if (visible) {
      finishProgress();
    }
  }, [pathname, finishProgress, visible]);

  // Instant Click Listener on all internal links
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const anchor = (e.target as HTMLElement)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Ignore anchor jumps, external links, new tabs, and downloads
      if (
        href.startsWith("#") ||
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey
      ) {
        return;
      }

      // If navigating to the same path, don't show loader
      const targetUrl = new URL(href, window.location.origin);
      if (
        targetUrl.pathname === window.location.pathname &&
        targetUrl.search === window.location.search
      ) {
        return;
      }

      // Instantly start loading indicator on click!
      startProgress();
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      clearTimers();
    };
  }, [startProgress, clearTimers]);

  if (!visible) return null;

  return (
    <>
      {/* Top progress bar */}
      <div
        role="progressbar"
        aria-label="Page loading"
        className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
      >
        <div
          className="h-full bg-gradient-to-r from-brand-500 via-indigo-500 to-amber-400 shadow-[0_0_12px_rgba(99,102,241,0.8)] transition-all duration-200 ease-out"
          style={{ width: `${width}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-amber-400 shadow-[0_0_10px_4px_rgba(251,191,36,0.6)] transition-all duration-200 ease-out"
          style={{ left: `calc(${width}% - 7px)` }}
        />
      </div>

      {/* Floating instant feedback pill */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none flex items-center gap-2 bg-slate-900/90 text-white dark:bg-slate-800/95 dark:text-slate-100 border border-slate-700/60 px-3.5 py-1.5 rounded-full shadow-lg backdrop-blur-md text-xs font-semibold animate-in fade-in zoom-in-95 duration-150">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-400 dark:text-brand-300" />
        <span>Loading page...</span>
      </div>
    </>
  );
}
