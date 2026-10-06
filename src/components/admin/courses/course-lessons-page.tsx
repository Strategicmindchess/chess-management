import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import LessonManager from "@/components/admin/courses/lesson-manager";

/** Shared server loader for admin & teacher course detail pages. */
export default async function CourseLessonsPage({ id, backHref }: { id: string; backHref: string }) {
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      lessons: {
        orderBy: [{ lessonNumber: "asc" }, { partNumber: "asc" }],
        select: {
          id: true, title: true, description: true, lessonNumber: true,
          partNumber: true, status: true, isPreview: true,
        },
      },
    },
  });
  if (!course) notFound();

  const { lessons, createdAt, updatedAt, ...rest } = course;
  return <LessonManager course={rest} lessons={lessons} backHref={backHref} />;
}
