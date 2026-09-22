import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import * as XLSX from "xlsx";
import { parseISO, format } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { withLogging } from "../../../../lib/api-logger";

function getAsiaKolkataMonthBoundaries(monthString: string) {
  const [yearStr, monthStrPart] = monthString.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStrPart, 10) - 1;
  const lastDay = new Date(year, month + 1, 0).getDate();

  const startDate = fromZonedTime(`${yearStr}-${monthStrPart}-01 00:00:00`, "Asia/Kolkata");
  const endDate = fromZonedTime(`${yearStr}-${monthStrPart}-${lastDay} 23:59:59.999`, "Asia/Kolkata");

  return { startDate, endDate };
}

// ─── GET /api/export/payouts?month=2026-08 ────────────────────────────────────
// Admin only — exports Coach + Staff payout summary as Excel (multi-sheet)
export let GET = withLogging(async function(req: NextRequest) {
    try {
    await requireRole([Role.ADMIN]);
    } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const monthStr = searchParams.get("month") || format(new Date(), "yyyy-MM");

    const { startDate, endDate } = getAsiaKolkataMonthBoundaries(monthStr);

    // ── Fetch all class logs for month ──────────────────────────────────────
    const logs = await prisma.classLog.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    include: {
      coach: { include: { user: true } },
      batch: true,
    },
    orderBy: { date: "asc" },
    });

    const coachIds = [...new Set(logs.map(l => l.coachProfileId))];
    const coaches = await prisma.coachProfile.findMany({
    where: { id: { in: coachIds } },
    include: {
      user: true,
      payoutAdjustments: { where: { month: monthStr } },
    },
    });

    // ── Build coach-wise rows ───────────────────────────────────────────────
    type CoachRow = {
    coachId: string;
    coachName: string;
    employmentType: string;
    tdsApplicable: boolean;
    sessions: number;
    grossPayout: number;
    penalties: number;
    adjustments: number;
    tdsAmount: number;
    netPayout: number;
    batches: string;
    };

    const coachMap = new Map<string, CoachRow>();

    for (const log of logs) {
    const cp = coaches.find(c => c.id === log.coachProfileId);
    if (!cp) continue;

    if (!coachMap.has(log.coachProfileId)) {
      const adjTotal = cp.payoutAdjustments.reduce((acc, a) => acc + a.amount, 0);
      coachMap.set(log.coachProfileId, {
        coachId: cp.id,
        coachName: cp.user.name,
        employmentType: cp.employmentType,
        tdsApplicable: cp.tdsApplicable,
        sessions: 0,
        grossPayout: 0,
        penalties: 0,
        adjustments: adjTotal,
        tdsAmount: 0,
        netPayout: 0,
        batches: "",
      });
    }

    const row = coachMap.get(log.coachProfileId)!;
    row.sessions += 1;
    row.grossPayout += log.payoutAmount;
    if (!log.penaltyWaived) row.penalties += log.penaltyAmount ?? 0;
    }

    // Add batch names and final calcs
    for (const [coachId, row] of coachMap) {
    const coachLogs = logs.filter(l => l.coachProfileId === coachId);
    const batchSet = new Set(coachLogs.map(l => l.batch.name));
    row.batches = [...batchSet].join(", ");

    const beforeTds = row.grossPayout - row.penalties + row.adjustments;
    row.tdsAmount = row.tdsApplicable ? Math.round(beforeTds * 0.1) : 0;
    row.netPayout = beforeTds - row.tdsAmount;
    }

    // ── Sheet 1: Coach Summary ─────────────────────────────────────────────
    const summaryData = Array.from(coachMap.values()).map(r => ({
    "Coach Name": r.coachName,
    "Employment Type": r.employmentType,
    "Batches": r.batches,
    "Sessions": r.sessions,
    "Gross Payout (₹)": r.grossPayout,
    "Penalties (₹)": r.penalties,
    "Adjustments (₹)": r.adjustments,
    "TDS 10% (₹)": r.tdsAmount,
    "Net Payout (₹)": r.netPayout,
    "TDS Applicable": r.tdsApplicable ? "Yes" : "No",
    }));

    // ── Sheet 2: Session Detail ────────────────────────────────────────────
    const detailData = logs.map(log => ({
    "Date": format(new Date(log.date), "dd-MM-yyyy"),
    "Coach": log.coach.user.name,
    "Batch": log.batch.name,
    "Batch Code": log.batch.code,
    "Topic": log.topicCovered,
    "Duration (mins)": log.durationMins,
    "Payout (₹)": log.payoutAmount,
    "Penalty (₹)": log.penaltyAmount ?? 0,
    "Penalty Waived": log.penaltyWaived ? "Yes" : "No",
    "Penalty Note": log.penaltyNote ?? "",
    }));

    // ── Build workbook ─────────────────────────────────────────────────────
    const wb = XLSX.utils.book_new();

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary["!cols"] = [
    { wch: 22 }, { wch: 16 }, { wch: 30 }, { wch: 10 },
    { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Coach Payout Summary");

    const wsDetail = XLSX.utils.json_to_sheet(detailData);
    wsDetail["!cols"] = [
    { wch: 14 }, { wch: 20 }, { wch: 22 }, { wch: 12 },
    { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, wsDetail, "Session Detail");

    // ── Sheet 3: Staff Payroll (Employee + Freelancer + Employer) ─────────────
    const staffMembers = await prisma.employeeProfile.findMany({
    where: { isActive: true },
    include: {
      attendance: { where: { date: { gte: startDate, lte: endDate } } },
      incentives: { where: { month: monthStr } },
    },
    orderBy: { name: "asc" },
    });

    if (staffMembers.length > 0) {
    const staffData = staffMembers.map(emp => {
      const overtimeBonus = emp.attendance.reduce((acc, a) => acc + a.overtimeBonus, 0);
      const totalIncentives = emp.incentives.reduce((acc, i) => acc + i.amount, 0);
      const grossPayout = emp.fixedSalary + overtimeBonus + totalIncentives;
      const tdsAmount = emp.tdsApplicable ? Math.round(grossPayout * 0.1) : 0;
      const netPayout = grossPayout - tdsAmount;
      const present = emp.attendance.filter(a => a.status === "PRESENT").length;
      const absent = emp.attendance.filter(a => a.status === "ABSENT").length;
      const halfDay = emp.attendance.filter(a => a.status === "HALF_DAY").length;

      return {
        "Name": emp.name,
        "Job Role": emp.jobRole,
        "Role Type": emp.employmentMode,          // Coach / Employee / Freelancer / Employer
        "Employment": emp.employeeType.replace("_", " "),
        "Fixed Salary (₹)": emp.fixedSalary,
        "Present Days": present,
        "Absent Days": absent,
        "Half Days": halfDay,
        "OT Bonus (₹)": overtimeBonus,
        "Incentives / Deductions (₹)": totalIncentives,
        "Gross Payout (₹)": grossPayout,
        "TDS 10% (₹)": tdsAmount,
        "Net Payout (₹)": netPayout,
        "TDS Applicable": emp.tdsApplicable ? "Yes" : "No",
      };
    });

    const wsStaff = XLSX.utils.json_to_sheet(staffData);
    wsStaff["!cols"] = [
      { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
      { wch: 14 }, { wch: 13 }, { wch: 12 }, { wch: 14 }, { wch: 22 },
      { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, wsStaff, "Staff Payroll");
    }

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const fileName = `SMC_Payouts_${monthStr}.xlsx`;
    return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
    });
    });
