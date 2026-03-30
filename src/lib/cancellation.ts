// Cancellation policy
// Improvement #12: Tiered cancellation fees

export interface CancellationResult {
  feePercent: number;
  fee: number;
  refundAmount: number;
  policy: string;
}

/**
 * Calculate cancellation fee based on how far in advance the cancellation is.
 * - More than 48 hours before: Free cancellation (0%)
 * - 24-48 hours before: 50% fee
 * - Less than 24 hours before: 100% fee (no refund)
 */
export function calculateCancellationFee(
  bookingDate: Date,
  bookingTime: string,
  totalPaid: number
): CancellationResult {
  const scheduled = new Date(bookingDate);
  const [hours, minutes] = bookingTime.split(":").map(Number);
  if (!isNaN(hours)) scheduled.setHours(hours, minutes || 0, 0, 0);

  const now = new Date();
  const hoursUntilBooking = (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilBooking > 48) {
    return { feePercent: 0, fee: 0, refundAmount: totalPaid, policy: "Free cancellation (more than 48 hours before)" };
  }

  if (hoursUntilBooking > 24) {
    const fee = Math.round(totalPaid * 0.5 * 100) / 100;
    return { feePercent: 50, fee, refundAmount: totalPaid - fee, policy: "50% cancellation fee (24-48 hours before)" };
  }

  return { feePercent: 100, fee: totalPaid, refundAmount: 0, policy: "Full charge — cancellation less than 24 hours before" };
}
