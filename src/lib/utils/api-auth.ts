import { createHash, randomBytes } from "crypto";

export function generateApiKey(): string {
  const bytes = randomBytes(24).toString("hex");
  return `sk_live_${bytes}`;
}

export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

export function validateApiKey(apiKey: string): boolean {
  return apiKey.startsWith("sk_live_") && apiKey.length >= 40;
}
