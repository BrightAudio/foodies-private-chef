import { describe, it, expect } from "vitest";
import { calculateCancellationFee } from "@/lib/cancellation";

describe("calculateCancellationFee", () => {
  const total = 100;

  it("returns 0% fee when > 48 hours before", () => {
    const futureDate = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const result = calculateCancellationFee(futureDate, "12:00", total);
    expect(result.feePercent).toBe(0);
    expect(result.fee).toBe(0);
    expect(result.refundAmount).toBe(100);
  });

  it("returns 50% fee when 24-48 hours before", () => {
    const futureDate = new Date(Date.now() + 36 * 60 * 60 * 1000);
    const result = calculateCancellationFee(futureDate, "12:00", total);
    expect(result.feePercent).toBe(50);
    expect(result.fee).toBe(50);
    expect(result.refundAmount).toBe(50);
  });

  it("returns 100% fee when < 24 hours before", () => {
    const futureDate = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const result = calculateCancellationFee(futureDate, "12:00", total);
    expect(result.feePercent).toBe(100);
    expect(result.fee).toBe(100);
    expect(result.refundAmount).toBe(0);
  });
});
