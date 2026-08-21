import { NextResponse } from 'next/server';
import { s3Client, BUCKET_NAME } from '@/lib/s3';
import { ListObjectsV2Command } from "@aws-sdk/client-s3";

export async function GET() {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: "SMC_CLASS_PGN/",
    Delimiter: "/",
  });
  const response = await s3Client.send(command);
  return NextResponse.json({
    prefixes: response.CommonPrefixes,
    contents: response.Contents?.map(c => c.Key),
  });
}
