import { Worker, Job } from 'bullmq';
import { connection } from '@/workers/queue';
import { transferRecordingToS3 } from '@/services/meet/meet-recording.service';
import { meetLogger } from '@/lib/meet/meet-logger';

export interface MeetRecordingJobData {
  meetingRecordingId: string;
}

export const meetRecordingWorker = new Worker<MeetRecordingJobData>(
  'meet-recording-queue',
  async (job: Job<MeetRecordingJobData>) => {
    const { meetingRecordingId } = job.data;
    meetLogger.info({ jobId: job.id, meetingRecordingId, attempt: job.attemptsMade + 1 }, 'Processing recording transfer job');

    await transferRecordingToS3(meetingRecordingId);
  },
  {
    connection,
    concurrency: 2,
  }
);

meetRecordingWorker.on('completed', (job) => {
  meetLogger.info({ jobId: job.id }, 'Recording transfer job completed successfully');
});

meetRecordingWorker.on('failed', (job, err) => {
  meetLogger.error({ jobId: job?.id, error: err.message }, 'Recording transfer job failed');
});

