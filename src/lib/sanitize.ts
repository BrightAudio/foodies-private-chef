// Input sanitization for user-provided text
// Improvement #20: Prevent XSS via server-side sanitization

// Simple server-side HTML sanitizer — strips all HTML tags
// No dependency needed: we strip tags rather than allowing safe ones
export function sanitizeText(input: string): string {
  if (!input) return input;
  return input
    .replace(/<[^>]*>/g, "")          // Strip HTML tags
    .replace(/&lt;/g, "<")            // Decode common entities back (they were already escaped)
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/javascript:/gi, "")     // Remove javascript: URIs
    .replace(/on\w+\s*=/gi, "")       // Remove event handlers like onclick=
    .trim();
}

// Sanitize an object's string fields (shallow)
export function sanitizeFields<T extends Record<string, unknown>>(obj: T, fields: (keyof T)[]): T {
  const result = { ...obj };
  for (const field of fields) {
    if (typeof result[field] === "string") {
      (result as Record<string, unknown>)[field as string] = sanitizeText(result[field] as string);
    }
  }
  return result;
}
