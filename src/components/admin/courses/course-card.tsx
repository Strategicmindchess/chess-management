"use client";

import { Edit, Trash2, Video, ImageOff, Eye, EyeOff, ArrowRight } from "lucide-react";
import { deleteCourse, toggleCoursePublish } from "@/actions/courses/course-actions";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function CourseCard({ course, onEdit }: { course: any; onEdit: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const base = pathname.startsWith("/teacher") ? "/teacher/courses" : "/admin/courses";
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Delete this course and all its lessons?")) return;
    setIsDeleting(true);
    const res = await deleteCourse(course.id);
    if (!res.success) alert(res.error);
    setIsDeleting(false);
    router.refresh();
  };

  const handleTogglePublish = async () => {
    setIsPublishing(true);
    const res = await toggleCoursePublish(course.id, !course.isPublished);
    if (!res.success) alert(res.error);
    setIsPublishing(false);
    router.refresh();
  };

  const iconBtn =
    "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50";

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:border-indigo-500/40 hover:shadow-indigo-500/10">
      <Link href={`${base}/${course.id}`} className="relative block aspect-video overflow-hidden bg-slate-800/60">
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
            <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white backdrop-blur">
              {course.level.replace(/_/g, " ")}
            </span>
          )}
        </div>
        <span
          className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur ${
            course.isPublished ? "bg-emerald-500/90 text-white" : "bg-amber-500/90 text-black"
          }`}
        >
          {course.isPublished ? "Published" : "Draft"}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 text-lg font-semibold text-white">{course.title}</h3>
        <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-400">{course.description}</p>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Video className="h-4 w-4" />
            {course._count?.lessons || 0} Lessons
          </span>
          <span className="font-bold text-white">₹{(course.price / 100).toFixed(2)}</span>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={handleTogglePublish}
            disabled={isPublishing}
            className={iconBtn}
            title={course.isPublished ? "Unpublish" : "Publish"}
          >
            {course.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <button type="button" onClick={onEdit} className={iconBtn} title="Edit">
            <Edit className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className={`${iconBtn} hover:!bg-red-500/20 hover:!text-red-400`}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <Link
            href={`${base}/${course.id}`}
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Lessons <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
