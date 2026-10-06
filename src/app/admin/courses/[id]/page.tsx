import { requireRole } from "@/lib/dal";
import CourseLessonsPage from "@/components/admin/courses/course-lessons-page";

export const dynamic = "force-dynamic";

export default async function AdminCourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["ADMIN"]);
  const { id } = await params;
  return <CourseLessonsPage id={id} backHref="/admin/courses" />;
}
