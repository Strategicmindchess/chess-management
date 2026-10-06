import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Role } from "@/lib/enums";
import StudentLessonPlayer from "@/components/student/courses/student-lesson-player";

export const dynamic = "force-dynamic";

export default async function StudentCourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole([Role.STUDENT]);
  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id, isPublished: true },
    include: {
      lessons: {
        orderBy: [{ lessonNumber: "asc" }, { partNumber: "asc" }],
        select: {
          id: true, title: true, description: true, lessonNumber: true,
          partNumber: true, status: true, isPreview: true,
        },
      },
      accesses: {
        where: { studentId: user.id }
      }
    },
  });

  if (!course) notFound();

  const hasAccess = course.accesses.length > 0;
  const { lessons, accesses, createdAt, updatedAt, ...rest } = course;

  return <StudentLessonPlayer course={rest} lessons={lessons} hasAccess={hasAccess} />;
}
