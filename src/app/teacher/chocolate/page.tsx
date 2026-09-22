import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { getCoachStudentsWithMarks } from "@/actions/chocolate-actions";
import { ChocolateChallengeClient } from "./chocolate-challenge-client";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function TeacherChocolatePage() {
  await requireRole([Role.TEACHER]);

  const students = await getCoachStudentsWithMarks();
  const currentMonth = format(new Date(), "MMMM yyyy");

  return (
    <ChocolateChallengeClient
      initialStudents={students}
      currentMonth={currentMonth}
    />
  );
}
