import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import CourseList from "@/components/admin/courses/course-list";
import { Settings } from "lucide-react";

export default async function AdminCoursesPage() {
  await requireRole(["ADMIN"]);

  const rawCourses = await prisma.course.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { lessons: true }
      },
      accesses: true
    }
  });

  const courses = rawCourses.map(c => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#5B45FF]/20 text-[#5B45FF]">
          <Settings className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Courses Management</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Create and manage paid courses, edit details, and add lessons.
          </p>
        </div>
      </div>
      
      {/* We pass the plain JSON objects to Client Component */}
      <CourseList initialCourses={courses} />
    </div>
  );
}
