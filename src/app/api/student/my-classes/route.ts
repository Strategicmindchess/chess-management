import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { getStudentDashboardData } from "@/actions/dashboard-actions";
import { getStudentAssignments } from "@/actions/assignment-actions";
import { isClassPast } from "@/lib/timezone";
import { withLogging } from "../../../../lib/api-logger";

export const dynamic = "force-dynamic";
export let GET = withLogging(async function (req: NextRequest) {
  const user = await requireRole([Role.STUDENT]);

  try {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: user.id }
    });

    if (!studentProfile) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const [dashboardData, assignmentData] = await Promise.all([
      getStudentDashboardData(studentProfile.id),
      getStudentAssignments(),
    ]);

    const { todayInstances, upcomingInstances } = dashboardData;
    const assignments = assignmentData.success ? assignmentData.data || [] : [];

    const filteredTodayInstances = todayInstances.filter(instance => {
      // Keep cancelled classes visible for the entire day
      if (instance.status === 'CANCELLED') return true;
      return !isClassPast(instance.date, instance.endTime);
    });

    return NextResponse.json({
      todayInstances: filteredTodayInstances,
      upcomingInstances,
      assignments,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch student dashboard" },
      { status: 500 }
    );
  }
});
