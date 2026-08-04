import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { s3Client, BUCKET_NAME } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop();
    const key = `profile-pictures/${user.id}-${Date.now()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: file.type,
      Body: buffer,
    });

    await s3Client.send(command);

    const url = `${process.env.S3_ENDPOINT_URL}/${BUCKET_NAME}/${key}`;

    // Update user profile picture in DB
    await prisma.user.update({
      where: { id: user.id },
      data: { profilePictureUrl: url },
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
