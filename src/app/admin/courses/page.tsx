import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import CourseList from "@/components/admin/courses/course-list";

export default async function AdminCoursesPage() {
  await requireRole(["ADMIN"]);

  const rawCourses = await prisma.course.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { lessons: true }
      }
    }
  });

  const courses = rawCourses.map(c => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses Management</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage paid courses, edit details, and add lessons.
          </p>
        </div>
      </div>
      
      {/* We pass the plain JSON objects to Client Component */}
      <CourseList initialCourses={courses} />
    </div>
  );
}
