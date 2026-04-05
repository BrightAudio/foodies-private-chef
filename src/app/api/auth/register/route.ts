import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";
import { sanitizeFields } from "@/lib/sanitize";
import { randomBytes } from "crypto";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
  // Rate limit registration
  const ip = getClientIP(req);
  const rl = await checkRateLimit(ip, "auth");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }
  const sanitized = sanitizeFields(body, ["name", "phone", "email"]);
  const { password, name, phone, role } = sanitized;
  const email = sanitized.email?.trim().toLowerCase();

  if (!email || !password || !name) {
    return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
  }

  // Password strength check
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const validRoles = ["CLIENT", "CHEF"];
  const userRole = validRoles.includes(role) ? role : "CLIENT";

  const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const emailVerifyToken = randomBytes(32).toString("hex");
  const emailVerifyTokenExp = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      phone: phone || null,
      role: userRole,
      emailVerifyToken,
      emailVerifyTokenExp,
    },
  });

  // Send verification email (async, don't block response)
  sendVerificationEmail({ email, name, token: emailVerifyToken }).catch((err) =>
    console.error("Failed to send verification email:", err)
  );

  const token = signToken({ userId: user.id, email: user.email, role: user.role });

  const res = NextResponse.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: false },
    message: "Account created. Please check your email to verify your account.",
  }, { status: 201 });
  res.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return res;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
