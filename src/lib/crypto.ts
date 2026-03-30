// SSN encryption at rest using AES-256-GCM
// Improvement #1: Encrypt PII before storing in database

import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-dev-key-change-in-production!!"; // Must be 32 bytes for AES-256

function getKey(): Buffer {
  // Derive a 32-byte key from the env variable
  return crypto.scryptSync(ENCRYPTION_KEY, "foodies-salt", 32);
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  // Format: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const [ivHex, authTagHex, encrypted] = ciphertext.split(":");
  if (!ivHex || !authTagHex || !encrypted) {
    // Not encrypted — return as-is (backward compatibility with existing data)
    return ciphertext;
  }
  try {
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    // If decryption fails, data might be unencrypted (legacy)
    return ciphertext;
  }
}

// Mask SSN for display: "1234" → "••••1234"
export function maskSSN(last4: string | null): string {
  if (!last4) return "—";
  const decrypted = decrypt(last4);
  return `••••${decrypted.slice(-4)}`;
}
