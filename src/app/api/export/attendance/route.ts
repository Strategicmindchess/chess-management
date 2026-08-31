import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import * as XLSX from "xlsx";
import { startOfMonth, endOfMonth, parseISO, format } from "date-fns";

// ─── GET /api/export/attendance?month=2026-08&coachId=xxx ─────────────────────
// Admin only — exports attendance register per coach per batch as Excel
export async function GET(req: NextRequest) {
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

  // ── Sheet per batch ────────────────────────────────────────────────────
  for (const [, group] of groups) {
    // Collect all unique students across this batch's logs
    const studentMap = new Map<string, string>(); // id → name
    for (const log of group.logs) {
      for (const rec of log.attendance) {
        if (!studentMap.has(rec.studentProfileId)) {
          studentMap.set(rec.studentProfileId, rec.student.user.name);
        }
      }
    }
    const students = Array.from(studentMap.entries()); // [id, name]

    // Build header row
    const dates = group.logs.map(l => format(new Date(l.date), "dd-MM-yy"));
    const payouts = group.logs.map(l => l.payoutAmount);
    const penalties = group.logs.map(l => l.penaltyWaived ? 0 : (l.penaltyAmount ?? 0));

    // Each row: Student | date1 | date2 | ... | Attendance% | Payout | Penalty | Net
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

    // Blank row then payout summary
    rows.push([]);
    rows.push(["Payout (₹)", ...payouts, ""]);
    rows.push(["Penalty (₹)", ...penalties, ""]);
    rows.push(["Net (₹)", ...payouts.map((p, i) => p - penalties[i]), ""]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 22 }, ...dates.map(() => ({ wch: 10 })), { wch: 14 }];

    // Sheet name max 31 chars
    const sheetName = `${group.batchName} (${group.coachName})`.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  if (wb.SheetNames.length === 0) {
    // No data — still return a sheet
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
}
