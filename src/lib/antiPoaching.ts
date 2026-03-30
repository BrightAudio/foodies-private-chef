// Anti-poaching filter: detects phone numbers, emails, social media handles, URLs
// Phase 6: Enhanced detection with categorization + strike system

const PHONE_REGEX = /(\+?\d[\d\s\-().]{6,}\d)/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const URL_REGEX = /https?:\/\/[^\s]+/gi;
const SOCIAL_HANDLE_REGEX = /@[a-zA-Z0-9._]{2,}/g;
const SPELLED_AT_REGEX = /\b[a-zA-Z0-9._%+-]+\s*(at|AT)\s*[a-zA-Z0-9.-]+\s*(dot|DOT)\s*[a-zA-Z]{2,}\b/gi;
const VENMO_CASHAPP_REGEX = /\b(venmo|cashapp|cash\s*app|zelle|paypal)\s*[:\-]?\s*\S+/gi;
const PAYMENT_MENTION_REGEX = /\b(venmo|cashapp|cash\s*app|zelle|paypal|wire\s*transfer|bank\s*transfer|western\s*union|crypto|bitcoin|btc|eth|usdt)\b/gi;
const NUMBER_OBFUSCATION_REGEX = /\b\d[\s.\-_]{1,}\d[\s.\-_]{1,}\d[\s.\-_]{1,}\d[\s.\-_]{1,}\d[\s.\-_]{1,}\d+\b/g;

const REPLACEMENT = "[contact info removed]";

export type FilterReason = "PHONE" | "EMAIL" | "URL" | "SOCIAL_HANDLE" | "PAYMENT_APP" | "OBFUSCATED_NUMBER";

interface FilterResult {
  filtered: string;
  wasFiltered: boolean;
  reasons: FilterReason[];
}

export function filterContactInfo(text: string): FilterResult {
  let filtered = text;
  const reasons: Set<FilterReason> = new Set();

  const checks: Array<{ pattern: RegExp; reason: FilterReason }> = [
    { pattern: EMAIL_REGEX, reason: "EMAIL" },
    { pattern: PHONE_REGEX, reason: "PHONE" },
    { pattern: URL_REGEX, reason: "URL" },
    { pattern: SOCIAL_HANDLE_REGEX, reason: "SOCIAL_HANDLE" },
    { pattern: SPELLED_AT_REGEX, reason: "EMAIL" },
    { pattern: VENMO_CASHAPP_REGEX, reason: "PAYMENT_APP" },
    { pattern: PAYMENT_MENTION_REGEX, reason: "PAYMENT_APP" },
    { pattern: NUMBER_OBFUSCATION_REGEX, reason: "OBFUSCATED_NUMBER" },
  ];

  for (const { pattern, reason } of checks) {
    const newText = filtered.replace(pattern, REPLACEMENT);
    if (newText !== filtered) {
      reasons.add(reason);
      filtered = newText;
    }
  }

  return {
    filtered,
    wasFiltered: reasons.size > 0,
    reasons: Array.from(reasons),
  };
}

/** Determine penalty based on strike count */
export function getStrikePenalty(strikeCount: number): {
  action: "WARNING" | "TEMP_RESTRICT" | "SUSPEND";
  message: string;
} {
  if (strikeCount <= 1) {
    return {
      action: "WARNING",
      message: "⚠️ Sharing contact info violates our Terms of Service. This is a warning.",
    };
  }
  if (strikeCount <= 3) {
    return {
      action: "TEMP_RESTRICT",
      message: "⚠️ Repeated contact sharing detected. Your messaging is temporarily restricted.",
    };
  }
  return {
    action: "SUSPEND",
    message: "🚫 Your account has been suspended for repeated Terms of Service violations.",
  };
}
