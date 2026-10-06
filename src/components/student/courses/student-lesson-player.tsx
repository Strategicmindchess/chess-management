"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Play, Lock, Unlock, Film, Loader2 } from "lucide-react";
import { getLessonVideoUrl } from "@/actions/courses/lesson-actions";
import { Dialog } from "@/components/ui/dialog";

export default function StudentLessonPlayer({ course, lessons, hasAccess }: { course: any; lessons: any[]; hasAccess: boolean }) {
  const [player, setPlayer] = useState<{ title: string; url: string } | null>(null);
  const [loading, setLoading] = useState<string | null>(null); // loading lessonId

  const handlePlay = async (lesson: any) => {
    if (!hasAccess && !lesson.isPreview) return; // double check

    setLoading(lesson.id);
    try {
      const res = await getLessonVideoUrl(lesson.id);
      if (res.success && res.url) {
        setPlayer({ title: lesson.title, url: res.url });
      } else {
        alert(res.error || "Failed to load video.");
      }
    } catch (err: any) {
      alert("Failed to load video.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <Link href="/student/courses" className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to courses
      </Link>

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Left column: Course Details */}
        <div className="md:w-1/3 space-y-4">
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-slate-800">
            {course.thumbnailUrl ? (
              <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-500">
                <Film className="h-10 w-10" />
              </div>
            )}
          </div>
          
          <div>
            <div className="mb-2 flex items-center gap-2">
              {hasAccess ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                  <Unlock className="h-3 w-3" /> Enrolled
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300 border border-white/10">
                  <Lock className="h-3 w-3" /> Locked
                </span>
              )}
              {course.level && (
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-slate-200">
                  {course.level.replace(/_/g, " ")}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white">{course.title}</h1>
            <p className="mt-2 text-sm text-slate-400 whitespace-pre-wrap">{course.description}</p>
          </div>
        </div>

        {/* Right column: Lessons */}
        <div className="md:w-2/3">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60">
            <div className="border-b border-white/10 bg-slate-900 px-4 py-3 font-semibold text-white">
              Course Content ({lessons.length} lessons)
            </div>
            
            {lessons.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                Lessons are being uploaded. Check back later!
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {lessons.map((lesson) => {
                  const canPlay = hasAccess || lesson.isPreview;
                  const isReady = lesson.status === "READY";

                  return (
                    <li key={lesson.id} className="flex items-center gap-4 p-4 transition hover:bg-white/[0.03]">
                      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                        <span className="text-sm font-bold leading-none">{lesson.lessonNumber}</span>
                        <span className="text-[10px] leading-none opacity-70">P{lesson.partNumber}</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className={`truncate font-medium ${canPlay ? "text-white" : "text-slate-400"}`}>
                          {lesson.title}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          {lesson.isPreview && !hasAccess && (
                            <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-violet-300 font-medium">Free preview</span>
                          )}
                          {!isReady && (
                            <span className="text-slate-500 italic">Video processing...</span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 pl-2">
                        {canPlay ? (
                          <button
                            onClick={() => handlePlay(lesson)}
                            disabled={!isReady || loading === lesson.id}
                            className="flex items-center justify-center h-10 w-10 rounded-full bg-white/5 text-white transition hover:bg-white/10 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                          >
                            {loading === lesson.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4 fill-current ml-0.5" />
                            )}
                          </button>
                        ) : (
                          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-slate-900 border border-white/5 text-slate-500">
                            <Lock className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!player} onClose={() => setPlayer(null)} title={player?.title ?? ""}>
        {player && <video src={player.url} controls autoPlay controlsList="nodownload" className="w-full rounded-lg bg-black" />}
      </Dialog>
    </div>
  );
}
