import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { getStudentDashboardData } from "@/actions/dashboard-actions";
import { getStudentAssignments } from "@/actions/assignment-actions";
import { getISTNow } from "@/lib/timezone";
import { getHours, getMinutes } from "date-fns";
import { withLogging } from "../../../../lib/api-logger";

export const dynamic = "force-dynamic";
export let GET = withLogging(async function(req: NextRequest) {
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

    const istNow = getISTNow();
    const currentHour = getHours(istNow);
    const currentMin = getMinutes(istNow);

    const filteredTodayInstances = todayInstances.filter(instance => {
      // Keep cancelled classes visible for the entire day
      if (instance.status === 'CANCELLED') return true;
      
      const [endH, endM] = instance.endTime.split(":").map(Number);
      if (currentHour > endH || (currentHour === endH && currentMin >= endM)) {
        return false; // already ended
      }
      return true;
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
