import type { Metadata } from "next";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { isFeesUnlocked } from "@/actions/fees-pin-action";
import { FeesPinForm } from "@/components/admin/fees/fees-pin-form";
import { FeesLedger } from "@/components/admin/fees/fees-ledger";
import type { FeeConfigRow, AvailableStudent, AvailableBatch } from "@/components/admin/fees/fees-ledger";

export const metadata: Metadata = { title: "Student Ledger · SMC CRM" };

export default async function AdminFeesPage() {
  await requireRole([Role.ADMIN]);

  // ── PIN Gate ─────────────────────────────────────────────────────────────────
  // If the httpOnly cookie isn't present, render the PIN entry screen.
  const unlocked = await isFeesUnlocked();
  if (!unlocked) {
    return <FeesPinForm />;
  }

  // ── Fetch data ───────────────────────────────────────────────────────────────
  const [allStudentsRaw, configs, batchesRaw] = await Promise.all([
    // All students without a fee config yet (for the "Add student" dropdown)
    prisma.user.findMany({
      where: { role: "STUDENT", emailVerified: true, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        phone: true,
        studentProfile: {
          select: {
            id: true,
            city: true,
            level: true,
            feeConfig: { select: { id: true } },
            enrollments: {
              select: {
                batch: { select: { id: true, code: true, name: true, type: true } },
              },
            },
            assignedCoach: {
              select: { user: { select: { name: true } } },
            },
          },
        },
      },
    }),

    // All fee configs with full student + cycle data
    prisma.studentFeeConfig.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        cycles: { orderBy: { createdAt: "asc" } },
        student: {
          select: {
            id: true,
            city: true,
            level: true,
            enrollments: {
              select: {
                batch: { select: { id: true, code: true, name: true, type: true } },
              },
            },
            assignedCoach: {
              select: { user: { select: { name: true } } },
            },
            user: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
      },
    }),

    // All active batches for the batch search
    prisma.batch.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        coach: { select: { user: { select: { name: true } } } },
      },
    }),
  ]);

  // Build set of studentProfileIds that already have a config (to exclude from dropdown)
  const configuredIds = new Set(configs.map((c) => c.studentProfileId));

  const availableStudents: AvailableStudent[] = allStudentsRaw
    .filter((u) => u.studentProfile !== null && !configuredIds.has(u.studentProfile!.id))
    .map((u) => ({
      userId: u.id,
      name: u.name,
      phone: u.phone ?? "",
      profileId: u.studentProfile!.id,
      city: u.studentProfile!.city ?? "",
      level: u.studentProfile!.level ?? null,
      coach: u.studentProfile!.assignedCoach?.user.name ?? null,
      batches: u.studentProfile!.enrollments.map((e) => e.batch),
    }));

  const availableBatches: AvailableBatch[] = batchesRaw.map((b) => ({
    id: b.id,
    code: b.code,
    name: b.name,
    coachName: b.coach?.user.name ?? null,
  }));

  return (
    <FeesLedger
      initialConfigs={configs as unknown as FeeConfigRow[]}
      availableStudents={availableStudents}
      availableBatches={availableBatches}
    />
  );
}
