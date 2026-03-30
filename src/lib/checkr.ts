// Checkr Background Check Integration
// Phase 2: Real background check API integration

const CHECKR_API_KEY = process.env.CHECKR_API_KEY;
const CHECKR_API_URL = process.env.CHECKR_API_URL || "https://api.checkr.com/v1";

export function isCheckrEnabled(): boolean {
  return !!CHECKR_API_KEY;
}

interface CheckrCandidate {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  dob: string;
  ssn: string;
  work_locations: { country: string; state: string; city: string }[];
}

interface CheckrInvitation {
  id: string;
  candidate_id: string;
  status: string;
  package: string;
  invitation_url: string;
}

interface CheckrReport {
  id: string;
  candidate_id: string;
  status: string; // pending | clear | consider | suspended
  adjudication: string | null;
  package: string;
  completed_at: string | null;
}

async function checkrFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  if (!CHECKR_API_KEY) {
    throw new Error("Checkr API key not configured");
  }

  const authHeader = Buffer.from(`${CHECKR_API_KEY}:`).toString("base64");

  return fetch(`${CHECKR_API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${authHeader}`,
      ...options.headers,
    },
  });
}

/** Create a candidate in Checkr */
export async function createCandidate(data: {
  firstName: string;
  lastName: string;
  email: string;
  dob: string; // YYYY-MM-DD
  ssn: string; // Full SSN required by Checkr
  city: string;
  state: string;
}): Promise<CheckrCandidate> {
  const res = await checkrFetch("/candidates", {
    method: "POST",
    body: JSON.stringify({
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      dob: data.dob,
      ssn: data.ssn,
      work_locations: [{ country: "US", state: data.state, city: data.city }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Checkr createCandidate failed: ${res.status} ${err}`);
  }

  return res.json();
}

/** Create an invitation (background check request) for a candidate */
export async function createInvitation(candidateId: string, packageSlug: string = "tasker_standard"): Promise<CheckrInvitation> {
  const res = await checkrFetch("/invitations", {
    method: "POST",
    body: JSON.stringify({
      candidate_id: candidateId,
      package: packageSlug,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Checkr createInvitation failed: ${res.status} ${err}`);
  }

  return res.json();
}

/** Get report status for a candidate */
export async function getReport(reportId: string): Promise<CheckrReport> {
  const res = await checkrFetch(`/reports/${reportId}`);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Checkr getReport failed: ${res.status} ${err}`);
  }

  return res.json();
}

/** Map Checkr status to our internal status */
export function mapCheckrStatus(checkrStatus: string): string {
  switch (checkrStatus) {
    case "clear":
      return "CLEAR";
    case "consider":
      return "CONSIDER";
    case "suspended":
      return "SUSPENDED";
    case "pending":
      return "PENDING";
    default:
      return "PENDING";
  }
}

/** Verify Checkr webhook signature */
export function verifyCheckrWebhook(body: string, signature: string): boolean {
  if (!process.env.CHECKR_WEBHOOK_SECRET) return false;

  const crypto = require("crypto");
  const expected = crypto
    .createHmac("sha256", process.env.CHECKR_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
