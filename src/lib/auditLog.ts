// Audit logging for admin actions
// Improvement #16: Track all admin actions with timestamp and admin user ID

import { prisma } from "./prisma";

interface AuditEntry {
  adminUserId: string;
  action: string;
  targetType: "CHEF" | "BOOKING" | "USER" | "TRUCK";
  targetId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export async function logAuditAction(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminUserId: entry.adminUserId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        details: entry.details ? JSON.stringify(entry.details) : null,
        ipAddress: entry.ipAddress || null,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
