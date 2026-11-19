import { NextRequest, NextResponse } from "next/server";
import { s3Client, BUCKET_NAME } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    if (!path || path.length === 0) {
      return new NextResponse("Path required", { status: 400 });
    }

    const key = path.map((segment) => decodeURIComponent(segment)).join("/");

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const s3Response = await s3Client.send(command);

    if (!s3Response.Body) {
      return new NextResponse("Media not found", { status: 404 });
    }

    const bytes = await s3Response.Body.transformToByteArray();
    const contentType = s3Response.ContentType || "image/jpeg";

    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(bytes.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
      return new NextResponse("File not found in storage", { status: 404 });
    }
    console.error("[Media Route Error]:", error);
    return new NextResponse("Failed to retrieve media", { status: 500 });
  }
}
