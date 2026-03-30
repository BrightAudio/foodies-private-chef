// Anti-poaching filter: detects phone numbers, emails, social media handles, URLs
// to prevent clients and chefs from exchanging contact info directly

const PHONE_REGEX = /(\+?\d[\d\s\-().]{6,}\d)/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const URL_REGEX = /https?:\/\/[^\s]+/gi;
const SOCIAL_HANDLE_REGEX = /@[a-zA-Z0-9._]{2,}/g;
const SPELLED_AT_REGEX = /\b[a-zA-Z0-9._%+-]+\s*(at|AT)\s*[a-zA-Z0-9.-]+\s*(dot|DOT)\s*[a-zA-Z]{2,}\b/gi;
const VENMO_CASHAPP_REGEX = /\b(venmo|cashapp|cash\s*app|zelle|paypal)\s*[:\-]?\s*\S+/gi;

const REPLACEMENT = "[contact info removed]";

export function filterContactInfo(text: string): { filtered: string; wasFiltered: boolean } {
  let filtered = text;
  let wasFiltered = false;

  const patterns = [
    EMAIL_REGEX,
    PHONE_REGEX,
    URL_REGEX,
    SOCIAL_HANDLE_REGEX,
    SPELLED_AT_REGEX,
    VENMO_CASHAPP_REGEX,
  ];

  for (const pattern of patterns) {
    const newText = filtered.replace(pattern, REPLACEMENT);
    if (newText !== filtered) {
      wasFiltered = true;
      filtered = newText;
    }
  }

  return { filtered, wasFiltered };
}
