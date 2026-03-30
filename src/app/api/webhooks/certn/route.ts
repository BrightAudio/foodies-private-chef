import { NextResponse } from "next/server";

// DEPRECATED — Certn replaced by Checkr
// Criminal background check webhooks now handled by /api/webhooks/checkr
// This route returns a redirect notice for any stale webhook configurations
export async function POST() {
  return NextResponse.json({
    error: "Certn integration deprecated. Criminal background check webhooks are now at /api/webhooks/checkr",
  }, { status: 410 });
}
