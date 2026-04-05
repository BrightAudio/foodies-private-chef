import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";

// DEPRECATED — Certn replaced by Checkr
// Criminal background check webhooks now handled by /api/webhooks/checkr
// This route returns a redirect notice for any stale webhook configurations
async function _POST() {
  return NextResponse.json({
    error: "Certn integration deprecated. Criminal background check webhooks are now at /api/webhooks/checkr",
  }, { status: 410 });
}


export const POST = withErrorHandler(_POST);