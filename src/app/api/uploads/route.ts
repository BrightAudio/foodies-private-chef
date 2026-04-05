import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";
import { optimizeImage } from "@/lib/imageOptimize";
import { isS3Enabled, uploadImageToS3 } from "@/lib/s3";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// POST /api/uploads — upload an image (S3 if configured, local fallback)
export async function POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit uploads
  const ip = getClientIP(req);
  const rl = await checkRateLimit(ip, "upload");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many uploads. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, and WebP images are allowed" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${uuidv4()}.${file.name.split(".").pop()?.toLowerCase() || "jpg"}`;

  // Use S3 if configured, otherwise local filesystem
  if (isS3Enabled()) {
    const result = await uploadImageToS3(buffer, filename, file.type);
    return NextResponse.json({ url: result.url, thumbUrl: result.thumbUrl });
  }

  // Local fallback — only works in dev (Vercel has a read-only filesystem)
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const result = await optimizeImage(buffer, filename);
    return NextResponse.json({ url: result.url, thumbUrl: result.thumbUrl });
  } catch {
    return NextResponse.json(
      { error: "File storage not configured. Set up S3 for production uploads." },
      { status: 503 }
    );
  }
}
