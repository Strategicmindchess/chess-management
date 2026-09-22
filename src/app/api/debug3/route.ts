export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { listS3Folder } from '@/actions/s3-actions';

export async function GET() {
  try {
    const data = await listS3Folder("SMC_ASSIGNMENT/");
    return NextResponse.json({
      timestamp: Date.now(),
      data
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
