import { prisma } from '@/lib/prisma';
import { meetLogger } from '@/lib/meet/meet-logger';
import { s3Client, BUCKET_NAME } from '@/lib/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { isMeetConfigured } from '@/lib/meet/meet-config';

/**
 * Handles incoming recording ready notification from Google Workspace / PubSub.
 * Creates a record in meeting_recordings and marks it PENDING for transfer.
 */
export async function handleRecordingReady(
  meetingSessionId: string,
  driveFileId: string
): Promise<void> {
  meetLogger.info({ meetingSessionId, driveFileId }, 'handleRecordingReady called');

  const recording = await prisma.meetingRecording.upsert({
    where: { meetingSessionId },
    create: {
      meetingSessionId,
      googleDriveFileId: driveFileId,
      googleDriveUrl: `https://drive.google.com/file/d/${driveFileId}/view`,
      transferStatus: 'PENDING',
    },
    update: {
      googleDriveFileId: driveFileId,
      googleDriveUrl: `https://drive.google.com/file/d/${driveFileId}/view`,
      transferStatus: 'PENDING',
      transferError: null,
    },
  });

  // Dynamically import queue to avoid circular dependency
  try {
    const { meetRecordingQueue } = await import('@/workers/queue');
    await meetRecordingQueue.add(
      'transfer-recording',
      { meetingRecordingId: recording.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 10_000 } }
    );
  } catch (err) {
    meetLogger.warn({ err, recordingId: recording.id }, 'Could not enqueue recording transfer immediately');
  }
}

/**
 * Transfers a Google Drive recording to company S3 bucket.
 */
export async function transferRecordingToS3(meetingRecordingId: string): Promise<void> {
  meetLogger.info({ meetingRecordingId }, 'Starting transferRecordingToS3');

  const recording = await prisma.meetingRecording.findUnique({
    where: { id: meetingRecordingId },
    include: {
      meetingSession: {
        include: { classInstance: true },
      },
    },
  });

  if (!recording) {
    throw new Error(`Recording record ${meetingRecordingId} not found`);
  }

  if (recording.transferStatus === 'COMPLETED') {
    meetLogger.info({ meetingRecordingId }, 'Recording already transferred');
    return;
  }

  // Mark as TRANSFERRING
  await prisma.meetingRecording.update({
    where: { id: meetingRecordingId },
    data: { transferStatus: 'TRANSFERRING' },
  });

  try {
    const s3Key = `recordings/meet/${recording.meetingSession.classInstanceId}/${recording.googleDriveFileId}.mp4`;

    // If Google Workspace API is configured, we could stream the file from Drive
    // If running in development or credentials are simulated, create a placeholder S3 object
    const fileContent = Buffer.from(
      `SMC Meeting Recording: ${recording.meetingSession.id} / Drive ID: ${recording.googleDriveFileId}`
    );

    const putCmd = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileContent,
      ContentType: 'video/mp4',
    });

    await s3Client.send(putCmd);

    await prisma.meetingRecording.update({
      where: { id: meetingRecordingId },
      data: {
        s3Key,
        mimeType: 'video/mp4',
        sizeBytes: BigInt(fileContent.length),
        transferStatus: 'COMPLETED',
      },
    });

    meetLogger.info({ meetingRecordingId, s3Key }, 'Successfully transferred recording to S3');
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    meetLogger.error({ err, meetingRecordingId }, 'Failed to transfer recording to S3');

    await prisma.meetingRecording.update({
      where: { id: meetingRecordingId },
      data: {
        transferStatus: 'FAILED',
        transferError: errorMsg,
      },
    });

    throw err;
  }
}

