import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import * as XLSX from "xlsx";
import { startOfMonth, endOfMonth, parseISO, format, getISOWeek, startOfWeek, endOfWeek } from "date-fns";
import { withLogging } from "../../../../lib/api-logger";

// ─── GET /api/export/attendance?month=2026-08&coachId=xxx ─────────────────────
// Admin only — exports attendance register per coach per batch as Excel
export let GET = withLogging(async function(req: NextRequest) {
    try {
    await requireRole([Role.ADMIN]);
    } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const monthStr = searchParams.get("month") || format(new Date(), "yyyy-MM");
    const coachIdFilter = searchParams.get("coachId") || undefined;

    const date = parseISO(monthStr);
    const startDate = startOfMonth(date);
    const endDate = endOfMonth(date);

    // ── Fetch class logs with attendance ─────────────────────────────────────
    const logs = await prisma.classLog.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      ...(coachIdFilter ? { coachProfileId: coachIdFilter } : {}),
    },
    include: {
      coach: { include: { user: true } },
      batch: true,
      attendance: {
        include: {
          student: { include: { user: { select: { name: true } } } },
        },
      },
    },
    orderBy: [{ coachProfileId: "asc" }, { batchId: "asc" }, { date: "asc" }],
    });

    const wb = XLSX.utils.book_new();

    // ── Group by coach → batch ─────────────────────────────────────────────
    type SheetGroup = { coachName: string; batchName: string; logs: typeof logs };
    const groups = new Map<string, SheetGroup>();

    for (const log of logs) {
    const key = `${log.coachProfileId}__${log.batchId}`;
    if (!groups.has(key)) {
      groups.set(key, {
        coachName: log.coach.user.name,
        batchName: log.batch.name,
        logs: [],
      });
    }
    groups.get(key)!.logs.push(log);
    }

    // ── Coach Summary Sheet (first sheet) ─────────────────────────────────
    const coachSummaryMap = new Map<string, {
    coachName: string;
    totalClasses: number;
    byWeek: Map<string, { weekLabel: string; days: Set<string>; classes: number }>;
    byBatch: Map<string, { batchName: string; classes: number }>;
    }>();

    for (const log of logs) {
    const coachId = log.coachProfileId;
    const coachName = log.coach.user.name;
    const logDate = new Date(log.date);

    const weekNum = getISOWeek(logDate);
    const weekKey = `${logDate.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
    const weekStart = format(startOfWeek(logDate, { weekStartsOn: 1 }), "dd MMM");
    const weekEnd   = format(endOfWeek(logDate,   { weekStartsOn: 1 }), "dd MMM");
    const weekLabel = `Week ${weekNum} (${weekStart} – ${weekEnd})`;

    if (!coachSummaryMap.has(coachId)) {
      coachSummaryMap.set(coachId, { coachName, totalClasses: 0, byWeek: new Map(), byBatch: new Map() });
    }
    const coach = coachSummaryMap.get(coachId)!;
    coach.totalClasses++;

    if (!coach.byWeek.has(weekKey)) {
      coach.byWeek.set(weekKey, { weekLabel, days: new Set(), classes: 0 });
    }
    const week = coach.byWeek.get(weekKey)!;
    week.days.add(format(logDate, "EEEE")); // e.g. "Monday"
    week.classes++;

    if (!coach.byBatch.has(log.batchId)) {
      coach.byBatch.set(log.batchId, { batchName: log.batch.name, classes: 0 });
    }
    coach.byBatch.get(log.batchId)!.classes++;
    }

    const summaryRows: (string | number)[][] = [
    [`SMC Coach Working Summary — ${format(startDate, "MMMM yyyy")}`],
    [],
    ["Coach Name", "Total Classes", "Week", "Working Days in Week", "Classes in Week", "Batch", "Classes in Batch"],
    ];

    for (const [, coach] of coachSummaryMap) {
    const weeks   = Array.from(coach.byWeek.values()).sort((a, b) => a.weekLabel.localeCompare(b.weekLabel));
    const batches = Array.from(coach.byBatch.values());
    const maxRows = Math.max(weeks.length, batches.length);

    for (let i = 0; i < maxRows; i++) {
      const w = weeks[i];
      const b = batches[i];
      summaryRows.push([
        i === 0 ? coach.coachName : "",
        i === 0 ? coach.totalClasses : "",
        w ? w.weekLabel : "",
        w ? w.days.size : "",
        w ? w.classes : "",
        b ? b.batchName : "",
        b ? b.classes : "",
      ]);
    }
    summaryRows.push([]); // blank row between coaches
    }

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
    summaryWs["!cols"] = [
    { wch: 24 }, // Coach Name
    { wch: 14 }, // Total Classes
    { wch: 28 }, // Week
    { wch: 22 }, // Working Days in Week
    { wch: 16 }, // Classes in Week
    { wch: 26 }, // Batch
    { wch: 18 }, // Classes in Batch
    ];
    XLSX.utils.book_append_sheet(wb, summaryWs, "Coach Summary");

    // ── Sheet per batch ────────────────────────────────────────────────────
    for (const [, group] of groups) {
    const studentMap = new Map<string, string>();
    for (const log of group.logs) {
      for (const rec of log.attendance) {
        if (!studentMap.has(rec.studentProfileId)) {
          studentMap.set(rec.studentProfileId, rec.student.user.name);
        }
      }
    }
    const students = Array.from(studentMap.entries());

    const dates    = group.logs.map(l => format(new Date(l.date), "dd-MM-yy"));
    const payouts  = group.logs.map(l => l.payoutAmount);
    const penalties = group.logs.map(l => l.penaltyWaived ? 0 : (l.penaltyAmount ?? 0));

    const headerRow = ["Student", ...dates, "Attendance %"];
    const rows: (string | number)[][] = [headerRow];

    for (const [studentId, studentName] of students) {
      const row: (string | number)[] = [studentName];
      let present = 0;
      for (const log of group.logs) {
        const rec = log.attendance.find(a => a.studentProfileId === studentId);
        const status = rec ? (rec.status === "PRESENT" ? "P" : "A") : "-";
        if (status === "P") present++;
        row.push(status);
      }
      const pct = group.logs.length > 0 ? Math.round((present / group.logs.length) * 100) : 0;
      row.push(`${pct}%`);
      rows.push(row);
    }

    rows.push([]);
    rows.push(["Payout (₹)",  ...payouts,                              ""]);
    rows.push(["Penalty (₹)", ...penalties,                            ""]);
    rows.push(["Net (₹)",     ...payouts.map((p, i) => p - penalties[i]), ""]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 22 }, ...dates.map(() => ({ wch: 10 })), { wch: 14 }];

    const sheetName = `${group.batchName} (${group.coachName})`.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    if (wb.SheetNames.length === 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["No data for this month"]]), "Empty");
    }

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const fileName = `SMC_Attendance_${monthStr}${coachIdFilter ? `_coach_${coachIdFilter.slice(-6)}` : ""}.xlsx`;

    return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
    });
    });
