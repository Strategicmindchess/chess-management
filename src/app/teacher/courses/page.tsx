import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import CourseList from "@/components/admin/courses/course-list";
import { getPresignedUrlFromPublicUrl } from "@/lib/s3";

export default async function TeacherCoursesPage() {
  await requireRole(["TEACHER"]);

  const rawCourses = await prisma.course.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { lessons: true }
      }
    }
  });

  const courses = await Promise.all(
    rawCourses.map(async (c) => ({
      ...c,
      thumbnailUrl: await getPresignedUrlFromPublicUrl(c.thumbnailUrl),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Courses Management</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Create and manage courses, edit details, and add lessons.
          </p>
        </div>
      </div>
      
      {/* We reuse the admin CourseList component as they have identical permissions for now */}
      <CourseList initialCourses={courses} />
    </div>
  );
}
