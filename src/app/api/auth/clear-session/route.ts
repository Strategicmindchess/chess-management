import { NextResponse } from "next/server";
import { endSession } from "@/services/auth/session";

export async function GET(request: Request) {
  await endSession();
  const url = new URL("/login", request.url);
  return NextResponse.redirect(url);
}
