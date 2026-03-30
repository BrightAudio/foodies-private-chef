import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";
import { sanitizeFields } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  // Rate limit registration
  const ip = getClientIP(req);
  const rl = checkRateLimit(ip, "auth");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  const body = await req.json();
  const sanitized = sanitizeFields(body, ["name", "phone", "email"]);
  const { email, password, name, phone, role } = sanitized;

  if (!email || !password || !name) {
    return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 });
  }

  // Password strength check
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const validRoles = ["CLIENT", "CHEF"];
  const userRole = validRoles.includes(role) ? role : "CLIENT";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, phone: phone || null, role: userRole },
  });

  const token = signToken({ userId: user.id, email: user.email, role: user.role });

  return NextResponse.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  }, { status: 201 });
}
