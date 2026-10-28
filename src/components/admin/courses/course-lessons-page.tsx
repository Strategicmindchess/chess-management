import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPresignedUrlFromPublicUrl } from "@/lib/s3";
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
          partNumber: true, status: true, isPreview: true, thumbnailUrl: true,
        },
      },
    },
  });
  if (!course) notFound();

  course.thumbnailUrl = await getPresignedUrlFromPublicUrl(course.thumbnailUrl);

  const presignedLessons = await Promise.all(
    course.lessons.map(async (l) => ({
      ...l,
      thumbnailUrl: await getPresignedUrlFromPublicUrl(l.thumbnailUrl),
    }))
  );

  const { createdAt, updatedAt, ...rest } = course;
  return <LessonManager course={rest} lessons={presignedLessons} backHref={backHref} />;
}
