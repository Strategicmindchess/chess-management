import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const reqs = await prisma.coachRescheduleRequest.findMany({
    where: { status: 'APPROVED' },
    orderBy: { reviewedAt: 'desc' },
    take: 1,
    include: { classInstance: { include: { batch: true } } }
  });
  return NextResponse.json(reqs);
}
