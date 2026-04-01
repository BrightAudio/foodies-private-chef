// Fire-and-forget interest tracking — like a pixel/beacon
export function trackInterest(signal: {
  signalType: string;
  cuisineType?: string;
  dishKeyword?: string;
  chefProfileId?: string;
}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) return;

  fetch("/api/interests/track", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(signal),
  }).catch(() => {}); // Silent — never block UI
}

// Extract keywords from a dish name/description for tracking
export function extractDishKeywords(text: string): string[] {
  const stopWords = new Set(["the", "and", "with", "our", "for", "from", "this", "that", "its", "has", "are", "was", "chef"]);
  return text
    .toLowerCase()
    .split(/[\s,.\-/]+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w))
    .slice(0, 5);
}
