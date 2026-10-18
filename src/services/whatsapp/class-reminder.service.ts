import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/services/whatsapp/client';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES & DATA CONTRACTS
// ============================================================================

/**
 * Clean recipient object used internally by the batch dispatcher.
 * Har recipient ke paas sanitized E.164 phone number aur unka personalized name hota hai.
 */
export interface Recipient {
  phone: string;                // Guaranteed valid E.164 format (e.g. "919305302337")
  name: string;                 // Personalized display name (Coach name ya Student name)
  role: 'Coach' | 'Student';    // Role identifier
}

/**
 * Real-time progress payload passed to BullMQ job.updateProgress() or UI callbacks.
 */
export interface SendProgress {
  completed: number;            // Total processed so far (sent + failed)
  total: number;                // Total recipients in batch
  sent: number;                 // Successfully delivered to Meta gateway
  failed: number;               // Rejected or errored out
}

/**
 * Return summary of the batch dispatch operation.
 */
export interface ReminderResult {
  total: number;                // Total eligible recipients found
  sent: number;                 // Count of messages accepted by Meta
  failed: number;               // Count of failed dispatches
  errors: Array<{ phone: string; error: string }>; // Individual error details per number
  messageIds: string[];         // List of Meta wamid IDs for webhook correlation
}

// ============================================================================
// HELPER 1: PHONE NUMBER SANITIZATION & VALIDATION
// ============================================================================

/**
 * @function toE164Valid
 * @description
 * User ke raw phone number ko standard WhatsApp E.164 (India 91) format me clean karta hai.
 * 
 * Rules:
 * 1. Non-digit characters (spaces, dashes, brackets, '+') ko remove karta hai.
 * 2. Agar number '0' se start hota hai aur 11 digits hain (e.g. "09305302337"), to leading '0' strip karta hai.
 * 3. Agar 10 digits hain (e.g. "9305302337"), to aage "91" add karta hai -> "919305302337".
 * 4. Agar already 12 digits '91' se start hain, to as-is return karta hai.
 * 5. Agar number corrupt hai (e.g. empty, "0", ya less than 10 digits), to 'null' return karta hai
 *    taaki invalid numbers par Meta API call waste na ho.
 */
export function toE164Valid(phone?: string | null): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');

  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.startsWith('91') && digits.length === 12) {
    return digits;
  }
  if (digits.length > 10) {
    return `91${digits.slice(-10)}`;
  }
  return null; // Invalid or short phone number
}

// ============================================================================
// HELPER 2: HIGH-PERFORMANCE BATCH DISPATCHER WITH ERROR ISOLATION
// ============================================================================

/**
 * @function sendInBatches
 * @description
 * Controlled Concurrency Batching engine jo ek-ek karke wait karne ke bajaye
 * 6-8 messages ek sath parallel dispatch karta hai.
 * 
 * Key Advantages:
 * 1. Speed: 100 students ko 50 seconds ke bajaye sirf 3-5 seconds me bhejta hai.
 * 2. Error Isolation (Promise.allSettled): Agar student #5 ka number invalid hai,
 *    to baki 99 students ka reminder fail nahi hoga.
 * 3. Rate-Limit Safety: Chunks ke beech 50ms ka safe delay deta hai taaki
 *    Meta Cloud API ka rate limit (80 req/sec) breach na ho.
 * 4. Telemetry: BullMQ job ya caller ko real-time progress report karta hai.
 */
async function sendInBatches(
  recipients: Recipient[],
  sendFn: (r: Recipient) => Promise<{ success: boolean; messageId?: string }>,
  onProgress?: (progress: SendProgress) => Promise<void>,
  concurrency = 6,
  delayBetweenBatchesMs = 50
): Promise<ReminderResult> {
  const total = recipients.length;
  let sent = 0;
  let failed = 0;
  const errors: Array<{ phone: string; error: string }> = [];
  const messageIds: string[] = [];

  // Concurrency chunks me divide karke process karein
  for (let i = 0; i < total; i += concurrency) {
    const chunk = recipients.slice(i, i + concurrency);

    // Promise.allSettled guarantees koi bhi single failure pure loop ko abort nahi karegi
    const results = await Promise.allSettled(chunk.map((r) => sendFn(r)));

    results.forEach((res, idx) => {
      const recipient = chunk[idx];
      if (res.status === 'fulfilled') {
        sent++;
        if (res.value?.messageId) {
          messageIds.push(res.value.messageId);
        }
      } else {
        failed++;
        const errMessage = res.reason?.message || String(res.reason);
        errors.push({ phone: recipient.phone, error: errMessage });
        logger.warn({ phone: recipient.phone, error: errMessage }, '[ClassReminderService] Failed to send reminder');
      }
    });

    // Real-time progress update (BullMQ dashboard / logging)
    if (onProgress) {
      await onProgress({ completed: sent + failed, total, sent, failed });
    }

    // Rate-limit throttle between chunks
    if (i + concurrency < total && delayBetweenBatchesMs > 0) {
      await new Promise((r) => setTimeout(r, delayBetweenBatchesMs));
    }
  }

  return { total, sent, failed, errors, messageIds };
}

// ============================================================================
// CORE SERVICE: AUTOMATED CLASS REMINDER
// ============================================================================

/**
 * @function sendClassReminderService
 * @description
 * Scheduled Class Instances ke liye automated reminder dispatch karta hai.
 * 
 * Workflow:
 * 1. Database Query: Class Instance, Batch code/name, Meet Link, Assigned Coach aur Enrolled Students fetch karta hai.
 * 2. Recipient Deduplication (Map):
 *    - Coach ka number fetch aur validate karta hai.
 *    - Enrolled students ka number fetch karta hai (agar student ka direct phone missing hai to parentPhone fallback use karta hai).
 *    - E.164 phone ko Map key banata hai taaki duplicate numbers filter ho sakein.
 * 3. Date & Time Formatting: Indian Standard Time (Asia/Kolkata) me class date aur start time format karta hai.
 * 4. Meta Cloud API Template Dispatch:
 *    - Template: 'smc_class_reminder' (Meta category: UTILITY).
 *    - Utility category hone ke karan Meta ispar kabhi Error 131049 frequency limit nahi lagata (100% immune).
 * 5. Returns execution stats (sent count, failed count, wamid message IDs).
 * 
 * @param classInstanceId - Prisma ID of the scheduled ClassInstance
 * @param onProgress - Optional callback to report real-time BullMQ progress
 */
export interface ClassReminderOptions {
  onProgress?: (progress: SendProgress) => Promise<void>;
  targetStudentIds?: string[];
}

export async function sendClassReminderService(
  classInstanceId: string,
  onProgressOrOptions?: ((progress: SendProgress) => Promise<void>) | ClassReminderOptions,
  legacyTargetStudentIds?: string[]
): Promise<ReminderResult> {
  const onProgress = typeof onProgressOrOptions === 'function' ? onProgressOrOptions : onProgressOrOptions?.onProgress;
  const targetStudentIds = typeof onProgressOrOptions === 'object' && onProgressOrOptions?.targetStudentIds
    ? onProgressOrOptions.targetStudentIds
    : legacyTargetStudentIds;
  // Step 1: Database se Class, Batch, Coach aur Students load karein
  const instance = await prisma.classInstance.findUnique({
    where: { id: classInstanceId },
    include: {
      batch: {
        include: {
          coach: { include: { user: true } },
          students: {
            include: {
              student: {
                include: { user: true },
              },
            },
          },
        },
      },
    },
  });

  if (!instance || !instance.batch) {
    logger.warn({ classInstanceId }, '[ClassReminderService] Class instance or batch not found');
    return { total: 0, sent: 0, failed: 0, errors: [], messageIds: [] };
  }

  // Step 2: Sanitized E.164 phone number ko Map key banakar deduplicate karein
  const recipientMap = new Map<string, Recipient>();

  // Coach add karein
  const coachPhone = toE164Valid(instance.batch.coach?.user?.phone);
  if (coachPhone) {
    recipientMap.set(coachPhone, {
      phone: coachPhone,
      name: instance.batch.coach?.user?.name || 'Coach',
      role: 'Coach',
    });
  }

  // Enrolled students add karein (agar student phone na ho to parentPhone fallback)
  if (instance.batch.students) {
    for (const bs of instance.batch.students) {
      if (targetStudentIds && targetStudentIds.length > 0 && !targetStudentIds.includes(bs.student.id)) {
        continue;
      }
      const studentUser = bs.student?.user;
      const rawPhone = studentUser?.phone || bs.student?.parentPhone;
      const studentPhone = toE164Valid(rawPhone);

      if (studentPhone && !recipientMap.has(studentPhone)) {
        recipientMap.set(studentPhone, {
          phone: studentPhone,
          name: studentUser?.name || bs.student?.parentName || 'Student',
          role: 'Student',
        });
      }
    }
  }

  const recipients = Array.from(recipientMap.values());
  if (recipients.length === 0) {
    logger.info({ classInstanceId }, '[ClassReminderService] No valid phone numbers found for this batch');
    return { total: 0, sent: 0, failed: 0, errors: [], messageIds: [] };
  }

  // Step 3: Date ko India Standard Time me format karein (e.g. "14 Oct")
  const dateStr = instance.date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
  });

  // Step 4: 'smc_class_reminder' template dispatch karein
  // Note: Ye UTILITY category template hai, ispar Error 131049 (ecosystem cap) kabhi nahi lagta.
  const result = await sendInBatches(
    recipients,
    (r) =>
      sendWhatsAppMessage({
        to: r.phone,
        templateName: 'smc_class_reminder',
        namedParams: {
          student_name: r.name,
          batch_name: instance.batch.name,
          class_date: dateStr,
          class_time: instance.startTime,
          class_link: instance.batch.meetLink || '',
        },
      }),
    onProgress
  );

  try {
    const fs = await import('fs');
    const path = await import('path');
    const logPath = path.resolve(process.cwd(), 'logs', 'worker.log');
    const entry = JSON.stringify({
      ts: new Date().toISOString(),
      level: result.failed > 0 && result.sent === 0 ? 'error' : 'info',
      msg: '[ClassReminder] Sent reminders via Meta Cloud API',
      classInstanceId,
      batch: instance.batch.name,
      recipientsCount: recipients.length,
      sent: result.sent,
      failed: result.failed,
      messageIds: result.messageIds,
      errors: result.errors,
    }) + '\n';
    fs.appendFileSync(logPath, entry, 'utf-8');
  } catch (_) {}

  return result;
}
