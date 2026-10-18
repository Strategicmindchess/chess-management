'use server';

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/dal';
import { Role } from '@/lib/enums';
import { sendWhatsAppMessage } from '@/services/whatsapp/client';
import { revalidatePath } from 'next/cache';

export interface WhatsAppMetrics {
  totalSent: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  deliveredPercent: number;
  readPercent: number;
  failedPercent: number;
  templateBreakdown: Array<{
    templateName: string;
    count: number;
    category: string;
  }>;
}

export interface WhatsAppConversationSummary {
  recipientPhone: string;
  recipientName: string;
  role: string;
  latestMessageAt: string;
  latestStatus: string;
  latestPreview: string;
  totalMessages: number;
}

export interface WhatsAppMessageItem {
  id: string;
  wamid?: string | null;
  recipientPhone: string;
  recipientName?: string | null;
  role?: string | null;
  templateName: string;
  templateCategory?: string | null;
  templateParams?: any;
  previewText?: string | null;
  status: string;
  errorMessage?: string | null;
  retryCount: number;
  createdAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
  failedAt?: string | null;
}

/**
 * Returns overall delivery counts and template-wise metrics for the History Dashboard
 */
export async function getWhatsAppMetricsAction(): Promise<WhatsAppMetrics> {
  await requireRole([Role.ADMIN]);

  try {
    const logs = await (prisma as any).whatsAppMessageLog.findMany({
      select: {
        id: true,
        status: true,
        templateName: true,
        templateCategory: true,
      },
    });

    const totalSent = logs.length;
    let deliveredCount = 0;
    let readCount = 0;
    let failedCount = 0;
    const templateCounts: Record<string, { count: number; category: string }> = {};

    for (const log of logs) {
      if (log.status === 'READ') {
        readCount++;
        deliveredCount++; // Read implies delivered
      } else if (log.status === 'DELIVERED') {
        deliveredCount++;
      } else if (log.status === 'FAILED') {
        failedCount++;
      }

      const tName = log.templateName || 'custom';
      if (!templateCounts[tName]) {
        templateCounts[tName] = { count: 0, category: log.templateCategory || 'UTILITY' };
      }
      templateCounts[tName].count++;
    }

    const templateBreakdown = Object.entries(templateCounts).map(([templateName, data]) => ({
      templateName,
      count: data.count,
      category: data.category,
    })).sort((a, b) => b.count - a.count);

    return {
      totalSent,
      deliveredCount,
      readCount,
      failedCount,
      deliveredPercent: totalSent > 0 ? Math.round((deliveredCount / totalSent) * 100) : 0,
      readPercent: totalSent > 0 ? Math.round((readCount / totalSent) * 100) : 0,
      failedPercent: totalSent > 0 ? Math.round((failedCount / totalSent) * 100) : 0,
      templateBreakdown,
    };
  } catch (err: any) {
    console.error('[getWhatsAppMetricsAction Error]:', err.message);
    return {
      totalSent: 0,
      deliveredCount: 0,
      readCount: 0,
      failedCount: 0,
      deliveredPercent: 0,
      readPercent: 0,
      failedPercent: 0,
      templateBreakdown: [],
    };
  }
}

/**
 * Returns list of distinct recipient threads for the left column of conversation history
 */
export async function getWhatsAppConversationsAction(searchQuery?: string): Promise<WhatsAppConversationSummary[]> {
  await requireRole([Role.ADMIN]);

  try {
    const logs = await (prisma as any).whatsAppMessageLog.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const threadMap = new Map<string, WhatsAppConversationSummary>();

    for (const log of logs) {
      const phone = log.recipientPhone;
      if (!threadMap.has(phone)) {
        threadMap.set(phone, {
          recipientPhone: phone,
          recipientName: log.recipientName || `User +${phone}`,
          role: log.role || 'Student',
          latestMessageAt: log.createdAt.toISOString(),
          latestStatus: log.status,
          latestPreview: log.previewText || `Template: ${log.templateName}`,
          totalMessages: 1,
        });
      } else {
        const thread = threadMap.get(phone)!;
        thread.totalMessages++;
      }
    }

    let result = Array.from(threadMap.values());

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) => t.recipientPhone.includes(q) || t.recipientName.toLowerCase().includes(q)
      );
    }

    return result;
  } catch (err: any) {
    console.error('[getWhatsAppConversationsAction Error]:', err.message);
    return [];
  }
}

/**
 * Returns complete chat message thread for a specific phone number
 */
export async function getWhatsAppMessagesForPhoneAction(phone: string): Promise<WhatsAppMessageItem[]> {
  await requireRole([Role.ADMIN]);

  try {
    const logs = await (prisma as any).whatsAppMessageLog.findMany({
      where: { recipientPhone: phone },
      orderBy: { createdAt: 'asc' },
    });

    return logs.map((l: any) => ({
      id: l.id,
      wamid: l.wamid,
      recipientPhone: l.recipientPhone,
      recipientName: l.recipientName,
      role: l.role,
      templateName: l.templateName,
      templateCategory: l.templateCategory,
      templateParams: l.templateParams,
      previewText: l.previewText,
      status: l.status,
      errorMessage: l.errorMessage,
      retryCount: l.retryCount || 0,
      createdAt: l.createdAt.toISOString(),
      deliveredAt: l.deliveredAt ? l.deliveredAt.toISOString() : null,
      readAt: l.readAt ? l.readAt.toISOString() : null,
      failedAt: l.failedAt ? l.failedAt.toISOString() : null,
    }));
  } catch (err: any) {
    console.error('[getWhatsAppMessagesForPhoneAction Error]:', err.message);
    return [];
  }
}

/**
 * Retries sending a failed or existing WhatsApp message
 */
export async function retryWhatsAppMessageAction(messageLogId: string): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const user = await requireRole([Role.ADMIN]);

  try {
    const log = await (prisma as any).whatsAppMessageLog.findUnique({
      where: { id: messageLogId },
    });

    if (!log) {
      return { success: false, error: 'Message record not found.' };
    }

    // Extract or synthesize robust parameters so no template ever fails due to empty history
    const rawParams = (log.templateParams as Record<string, string>) || {};
    let safeNamedParams: Record<string, string> = { ...rawParams };

    if (log.templateName === 'smc_class_reminder') {
      safeNamedParams = {
        student_name: safeNamedParams.student_name || log.recipientName || 'Student',
        batch_name: safeNamedParams.batch_name || 'Special Batch (42XK)',
        class_date: safeNamedParams.class_date || 'Today',
        class_time: safeNamedParams.class_time || '01:00 PM',
        class_link: safeNamedParams.class_link || 'https://meet.google.com/smc-chess-class',
      };
    }

    // Call Meta Cloud API directly
    const res = await sendWhatsAppMessage({
      to: log.recipientPhone,
      templateName: log.templateName,
      namedParams: safeNamedParams,
    });

    // Update log entry with new wamid & reset error
    await (prisma as any).whatsAppMessageLog.update({
      where: { id: messageLogId },
      data: {
        wamid: res.messageId || log.wamid,
        templateParams: safeNamedParams,
        status: 'SENT',
        errorMessage: null,
        retryCount: (log.retryCount || 0) + 1,
        updatedAt: new Date(),
        sentById: user.id,
      },
    });

    revalidatePath('/admin/communications');
    revalidatePath('/admin/communications/history');

    return { success: true, messageId: res.messageId };
  } catch (err: any) {
    console.error('[retryWhatsAppMessageAction Error]:', err.message);

    // Record error in database
    await (prisma as any).whatsAppMessageLog.update({
      where: { id: messageLogId },
      data: {
        status: 'FAILED',
        errorMessage: err.message || 'Retry failed',
        retryCount: { increment: 1 },
        failedAt: new Date(),
      },
    }).catch(() => {});

    return { success: false, error: err.message || 'Failed to retry message' };
  }
}

/**
 * Sends a direct template message to a specific recipient from the chat window
 */
export async function sendDirectTemplateMessageAction(
  phone: string,
  recipientName: string,
  templateName: string,
  namedParams: Record<string, string>,
  previewText?: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const user = await requireRole([Role.ADMIN]);

  try {
    const res = await sendWhatsAppMessage({
      to: phone,
      templateName,
      namedParams,
    });

    await (prisma as any).whatsAppMessageLog.create({
      data: {
        wamid: res.messageId,
        recipientPhone: phone,
        recipientName,
        role: 'Student',
        templateName,
        templateCategory: 'UTILITY',
        templateParams: namedParams,
        previewText: previewText || `Template: ${templateName} sent directly.`,
        status: 'SENT',
        sentById: user.id,
      },
    });

    revalidatePath('/admin/communications');
    revalidatePath('/admin/communications/history');

    return { success: true, messageId: res.messageId };
  } catch (err: any) {
    console.error('[sendDirectTemplateMessageAction Error]:', err.message);
    return { success: false, error: err.message || 'Direct dispatch failed' };
  }
}
