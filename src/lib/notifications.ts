/**
 * Idempotent notification helper.
 *
 * createNotification() uses upsert so it is safe to call multiple times for
 * the same business event — it will never create a duplicate.
 *
 * Convention for eventKey:
 *   "<TYPE>:<referenceId>:<recipientId>"
 *   e.g. "FEE_OVERDUE:feeCycleId123:userId456"
 *        "TICKET_RAISED:ticketId789:adminUserId"
 */

import { prisma } from "@/lib/prisma";
import { NotificationType, NotifPriority } from "@/generated/prisma/client";

export interface CreateNotificationInput {
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  eventKey: string;
  priority?: NotifPriority;
  href?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  const { recipientId, type, title, message, eventKey, priority = NotifPriority.NORMAL, href } = input;

  return prisma.notification.upsert({
    where: { eventKey },
    create: {
      recipientId,
      type,
      title,
      message,
      eventKey,
      priority,
      href,
    },
    update: {
      // Do not overwrite — event already recorded. Only update title/message if content genuinely changed.
      // For simplicity we leave existing record untouched on duplicate.
    },
  });
}

/**
 * Notify all admin users about a business event.
 * Fetches all users with role=ADMIN and creates a notification for each.
 */
export async function notifyAllAdmins(input: Omit<CreateNotificationInput, "recipientId" | "eventKey"> & {
  baseEventKey: string; // will be suffixed with each admin's userId
}) {
  const { baseEventKey, ...rest } = input;

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true },
  });

  await Promise.all(
    admins.map((admin) =>
      createNotification({
        ...rest,
        recipientId: admin.id,
        eventKey: `${baseEventKey}:${admin.id}`,
      })
    )
  );
}

