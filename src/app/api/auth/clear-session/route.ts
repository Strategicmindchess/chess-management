import { NextResponse } from "next/server";
import { endSession } from "@/services/auth/session";
import { withLogging } from "../../../../lib/api-logger";

export let GET = withLogging(async function(request: Request) {
    await endSession();
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
    });
