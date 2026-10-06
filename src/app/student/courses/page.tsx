import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Role } from "@/lib/enums";
import { ImageOff, Video, ArrowRight, Lock, Unlock, GraduationCap, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

function getLevelBadgeStyle(level: string) {
  if (!level) return "bg-slate-700 text-white";
  if (level.includes("BEGINNER") || level.includes("CORE")) return "bg-emerald-500 text-white";
  if (level.includes("INTERMEDIATE")) return "bg-blue-500 text-white";
  if (level.includes("ADVANCE")) return "bg-purple-500 text-white";
  if (level.includes("ELITE") || level.includes("EXPERT")) return "bg-orange-500 text-white";
  return "bg-slate-700 text-white";
}

export default async function StudentCoursesPage() {
  const user = await requireRole([Role.STUDENT]);

  // Fetch all published courses
  const courses = await prisma.course.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { lessons: true }
      },
      accesses: {
        where: { studentId: user.id }
      }
    }
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#5B45FF]/20 text-[#5B45FF]">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Available Courses</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Browse and learn from our premium chess courses.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map(course => {
          const hasAccess = course.accesses.length > 0;
          return (
            <div key={course.id} className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:border-indigo-500/40 hover:shadow-indigo-500/10">
              <Link href={`/student/courses/${course.id}`} className="relative block aspect-video overflow-hidden bg-slate-800/60">
                {course.thumbnailUrl ? (
                  <img
                    src={course.thumbnailUrl}
                    alt={course.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-500">
                    <ImageOff className="h-8 w-8" />
                    <span className="text-xs">No thumbnail</span>
                  </div>
                )}
                <div className="absolute left-3 top-3 flex gap-2">
                  {course.level && (
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase ${getLevelBadgeStyle(course.level)}`}>
                      {course.level.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <div className="absolute right-3 top-3">
                  {hasAccess ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[10px] font-bold uppercase text-white backdrop-blur">
                      <Unlock className="h-3 w-3" /> Enrolled
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-300 backdrop-blur border border-white/10">
                      <Lock className="h-3 w-3" /> Locked
                    </span>
                  )}
                </div>
              </Link>

              <div className="flex flex-1 flex-col p-4 bg-[#0B0F19]">
                <h3 className="line-clamp-1 text-[17px] font-bold text-white">{course.title}</h3>
                <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-slate-400 leading-relaxed">{course.description}</p>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-400 font-medium">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <Video className="h-3.5 w-3.5" />
                      {course._count.lessons} Lessons
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      --
                    </span>
                  </div>
                  {!hasAccess && (
                    <span className="font-bold text-[15px] text-white">₹{(course.price / 100).toFixed(0)}</span>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-white/10">
                  <Link
                    href={`/student/courses/${course.id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#5B45FF] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#4A35FF]"
                  >
                    {!hasAccess && <Lock className="h-3.5 w-3.5" />}
                    {hasAccess ? "Go to Course" : "View Course"}
                  </Link>
                </div>
              </div>
            </div>
          );
        })}

        {courses.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-500">
            No courses available at the moment.
          </div>
        )}
      </div>
    </div>
  );
}
