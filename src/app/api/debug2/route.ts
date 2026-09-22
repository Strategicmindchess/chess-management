export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { s3Client, BUCKET_NAME } from '@/lib/s3';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';

export async function GET() {
  try {
    const listCmd1 = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: '',
    });
    const res1 = await s3Client.send(listCmd1);
    
    return NextResponse.json({
      timestamp: Date.now(),
      allFiles: res1.Contents?.map(f => f.Key) || [],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
