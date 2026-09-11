import { NotificationType, NotifPriority } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/prisma";

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error("Please provide the email of the user to receive the notifications.");
    console.error("Usage: npx tsx scripts/add-test-notifications.ts <user-email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.error(`User with email ${email} not found in the database.`);
    process.exit(1);
  }

  console.log(`Found user ${user.name} (${user.id}). Generating test notifications...`);

  const notifications = [
    {
      type: NotificationType.TICKET_UPDATED,
      title: "Ticket #102 Resolved",
      message: "Your support ticket regarding class materials has been marked as resolved by admin.",
      priority: NotifPriority.NORMAL,
      isRead: false,
      eventKey: `test:ticket_resolved:${Date.now()}`,
    },
    {
      type: NotificationType.ATTENDANCE_ALERT,
      title: "Low Attendance Warning",
      message: "Your attendance has dropped below 75%. Please ensure you attend the upcoming classes.",
      priority: NotifPriority.HIGH,
      isRead: false,
      eventKey: `test:attendance_alert:${Date.now()}`,
    },
    {
      type: NotificationType.PAYOUT_PROCESSED,
      title: "Monthly Payout Processed",
      message: "Your payout for the previous month has been successfully processed and transferred.",
      priority: NotifPriority.URGENT,
      isRead: false,
      eventKey: `test:payout_processed:${Date.now()}`,
    },
    {
      type: NotificationType.TICKET_RAISED,
      title: "Welcome to SMC CRM",
      message: "This is a read notification just for testing purposes.",
      priority: NotifPriority.LOW,
      isRead: true, // Already read
      eventKey: `test:welcome:${Date.now()}`,
    }
  ];

  let added = 0;
  for (const notif of notifications) {
    await prisma.notification.upsert({
      where: { eventKey: notif.eventKey },
      create: {
        ...notif,
        recipientId: user.id,
      },
      update: {},
    });
    added++;
  }

  console.log(`Successfully added ${added} notifications for ${user.email}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
