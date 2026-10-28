"use client";

import { useState } from "react";
import { BookOpen, ImageOff } from "lucide-react";

interface CourseImageProps {
  src?: string | null;
  alt: string;
  title?: string;
  className?: string;
  aspectRatio?: string;
}

export default function CourseImage({
  src,
  alt,
  title,
  className = "h-full w-full object-cover transition duration-500 group-hover:scale-105",
  aspectRatio = "16/9",
}: CourseImageProps) {
  const [hasError, setHasError] = useState(false);

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
        className={className}
        style={{ width: "100%", aspectRatio, objectFit: "cover" }}
      />
    );
  }

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden bg-gradient-to-br from-indigo-500/10 via-slate-100 to-indigo-500/5 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-950 text-indigo-600 dark:text-indigo-400 transition duration-500 group-hover:scale-105"
      style={{ aspectRatio }}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 shadow-xs">
        <BookOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
      </div>
      <span className="max-w-[85%] truncate text-center text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-400 uppercase px-2">
        {title || alt || "Chess Course"}
      </span>
    </div>
  );
}
