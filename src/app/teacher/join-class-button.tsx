"use client";

import { useState } from "react";
import { Video } from "lucide-react";
import { recordClassJoinTime } from "@/actions/join-class-actions";

export function JoinClassButton({
  meetLink,
  classInstanceId,
}: {
  meetLink: string;
  classInstanceId: string;
}) {
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    // We don't want to spam the server if they click multiple times quickly
    if (!clicked) {
      setClicked(true);
      recordClassJoinTime(classInstanceId).catch(console.error);
    }
  };

  return (
    <a
      href={meetLink}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-10 px-4 text-sm bg-amber-400 hover:bg-amber-500 text-amber-950 w-full sm:w-auto shadow-[0_0_15px_rgba(251,191,36,0.3)]"
    >
      <Video className="w-4 h-4 mr-2" /> Join
    </a>
  );
}
