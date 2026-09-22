import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withLogging } from "../../../lib/api-logger";

export let GET = withLogging(async function() {
    try {
    const logs = await prisma.classLog.findMany({
      where: {
        batch: { name: { contains: "Core 2 IND-GC2-102" } }
      },
      include: {
        batch: true,
        classInstance: true
      },
      orderBy: { date: "desc" },
      take: 5
    });

    return NextResponse.json(logs);
    } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
    }
    });
