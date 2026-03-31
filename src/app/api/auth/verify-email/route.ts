import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/auth/verify-email?token=xxx — Verify email address
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Verification token is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { emailVerifyToken: token } });

  if (!user) {
    return NextResponse.json({ error: "Invalid or expired verification link" }, { status: 400 });
  }

  if (user.emailVerified) {
    return NextResponse.json({ message: "Email already verified", email: user.email });
  }

  if (user.emailVerifyTokenExp && user.emailVerifyTokenExp < new Date()) {
    return NextResponse.json({ error: "Verification link has expired. Please request a new one." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyTokenExp: null,
    },
  });

  return NextResponse.json({ message: "Email verified successfully", email: user.email });
}

// POST /api/auth/verify-email — Resend verification email
export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // Don't reveal if email exists
    return NextResponse.json({ message: "If that email is registered, a verification link has been sent." });
  }

  if (user.emailVerified) {
    return NextResponse.json({ message: "Email is already verified." });
  }

  const { randomBytes } = await import("crypto");
  const newToken = randomBytes(32).toString("hex");
  const newExp = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifyToken: newToken, emailVerifyTokenExp: newExp },
  });

  const { sendVerificationEmail } = await import("@/lib/email");
  sendVerificationEmail({ email: user.email, name: user.name, token: newToken }).catch((err) =>
    console.error("Failed to resend verification email:", err)
  );

  return NextResponse.json({ message: "If that email is registered, a verification link has been sent." });
}
