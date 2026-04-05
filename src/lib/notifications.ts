// Notification system
// Improvement #6: Create notifications for real-time updates

import { prisma } from "./prisma";

type NotificationType =
  | "BOOKING_CREATED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "BOOKING_COMPLETED"
  | "MESSAGE"
  | "TIP"
  | "BG_CHECK_UPDATE"
  | "EXPIRY_WARNING";

interface CreateNotification {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function createNotification(opts: CreateNotification) {
  return prisma.notification.create({
    data: {
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      body: opts.body,
      data: opts.data ? JSON.stringify(opts.data) : null,
    },
  });
}

export async function notifyBookingCreated(chefUserId: string, clientName: string, bookingId: string) {
  return createNotification({
    userId: chefUserId,
    type: "BOOKING_CREATED",
    title: "New Booking Request",
    body: `${clientName} has requested a private dining experience.`,
    data: { bookingId },
  });
}

export async function notifyBookingConfirmed(clientUserId: string, chefName: string, bookingId: string) {
  return createNotification({
    userId: clientUserId,
    type: "BOOKING_CONFIRMED",
    title: "Booking Confirmed",
    body: `Chef ${chefName} has confirmed your booking.`,
    data: { bookingId },
  });
}

export async function notifyBookingCancelled(userId: string, cancellerName: string, bookingId: string) {
  return createNotification({
    userId,
    type: "BOOKING_CANCELLED",
    title: "Booking Cancelled",
    body: `${cancellerName} has cancelled the booking.`,
    data: { bookingId },
  });
}

export async function notifyBookingCompleted(clientUserId: string, chefName: string, bookingId: string) {
  return createNotification({
    userId: clientUserId,
    type: "BOOKING_COMPLETED",
    title: "Experience Complete",
    body: `Your dining experience with Chef ${chefName} is complete. Leave a review!`,
    data: { bookingId },
  });
}

export async function notifyNewMessage(receiverId: string, senderName: string, bookingId: string) {
  return createNotification({
    userId: receiverId,
    type: "MESSAGE",
    title: "New Message",
    body: `${senderName} sent you a message.`,
    data: { bookingId },
  });
}

export async function notifyTip(chefUserId: string, clientName: string, amount: number, bookingId: string) {
  return createNotification({
    userId: chefUserId,
    type: "TIP",
    title: "You received a tip!",
    body: `${clientName} tipped you $${amount.toFixed(2)}.`,
    data: { bookingId },
  });
}

export async function notifyBgCheckUpdate(chefUserId: string, status: string) {
  const messages: Record<string, string> = {
    CLEARED: "Your background check has been cleared! You're one step closer to approval.",
    FAILED: "Your background check was not cleared. Please contact support.",
    APPROVED: "Congratulations! Your application has been fully approved. You can now accept bookings.",
    REJECTED: "Your application was not approved. Please contact support for details.",
    FLAGGED: "Your application has been flagged for additional review.",
  };
  return createNotification({
    userId: chefUserId,
    type: "BG_CHECK_UPDATE",
    title: "Verification Update",
    body: messages[status] || `Your verification status has been updated to: ${status}`,
  });
}

export async function notifyExpiryWarning(chefUserId: string, docType: string, expiryDate: Date) {
  return createNotification({
    userId: chefUserId,
    type: "EXPIRY_WARNING",
    title: `${docType} Expiring Soon`,
    body: `Your ${docType} expires on ${expiryDate.toLocaleDateString()}. Please renew it to maintain your active status.`,
  });
}
