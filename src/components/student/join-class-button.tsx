"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface JoinClassButtonProps {
  meetLink: string;
  nextInstance: {
    date: Date;
    startTime: string; // "10:00"
    endTime: string;   // "11:00"
  } | null;
}

export function JoinClassButton({ meetLink, nextInstance }: JoinClassButtonProps) {
  const [isActive, setIsActive] = useState(false);
  const [reason, setReason] = useState<string | null>("Checking schedule...");

  useEffect(() => {
    if (!nextInstance) {
      setIsActive(false);
      setReason("No upcoming classes");
      return;
    }

    const checkTime = () => {
      const now = new Date();
      
      // Parse instance date and times
      const instanceDate = new Date(nextInstance.date);
      const isToday = now.toDateString() === instanceDate.toDateString();

      if (!isToday) {
        setIsActive(false);
        setReason("Class is not today");
        return;
      }

      // Parse times
      const [startH, startM] = nextInstance.startTime.split(":").map(Number);
      const [endH, endM] = nextInstance.endTime.split(":").map(Number);
      
      const classStart = new Date(now);
      classStart.setHours(startH, startM, 0, 0);
      
      const classEnd = new Date(now);
      classEnd.setHours(endH, endM, 0, 0);

      // Allow joining 15 minutes before start
      const joinWindowStart = new Date(classStart.getTime() - 15 * 60 * 1000);

      if (now < joinWindowStart) {
        setIsActive(false);
        setReason("Class hasn't started yet");
      } else if (now > classEnd) {
        setIsActive(false);
        setReason("Class has ended");
      } else {
        setIsActive(true);
        setReason(null);
      }
    };

    checkTime();
    // Re-check every minute
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [nextInstance]);

  if (!isActive) {
    return (
      <span
        title={reason || "Cannot join"}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-md cursor-not-allowed transition-colors"
      >
        Join Class <ExternalLink className="h-3.5 w-3.5" />
      </span>
    );
  }

  return (
    <a
      href={meetLink}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-md hover:bg-brand-100 transition-colors"
    >
      Join Class <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}
