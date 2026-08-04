import { NextRequest, NextResponse } from "next/server";
import { SYLLABUS_MAP, type BatchLevel } from "@/lib/syllabus";

export async function GET(
  request: NextRequest,
  { params }: { params: { level: string } }
) {
  const level = params.level as BatchLevel;
  const syllabusInfo = SYLLABUS_MAP[level];

  if (!syllabusInfo) {
    return NextResponse.json({ error: "Syllabus level not found" }, { status: 404 });
  }

  return NextResponse.json(syllabusInfo);
}
