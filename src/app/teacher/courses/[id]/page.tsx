import { requireRole } from "@/lib/dal";
import CourseLessonsPage from "@/components/admin/courses/course-lessons-page";

export const dynamic = "force-dynamic";

export default async function TeacherCourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["TEACHER"]);
  const { id } = await params;
  return <CourseLessonsPage id={id} backHref="/teacher/courses" />;
}
