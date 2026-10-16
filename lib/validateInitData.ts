import { createHmac } from "crypto";

/**
 * Validates Telegram WebApp initData using HMAC-SHA256.
 * Returns the parsed user object if valid, throws if tampered.
 *
 * Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateInitData(initData: string): Record<string, string> {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN not set");

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new Error("No hash in initData");

  // Build data-check string: all fields except hash, sorted, joined by \n
  const entries: string[] = [];
  params.forEach((value, key) => {
    if (key !== "hash") entries.push(`${key}=${value}`);
  });
  entries.sort();
  const dataCheckString = entries.join("\n");

  // HMAC key = HMAC-SHA256("WebAppData", BOT_TOKEN)
  const secretKey = createHmac("sha256", "WebAppData")
    .update(BOT_TOKEN)
    .digest();

  const expectedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (expectedHash !== hash) {
    throw new Error("Invalid initData signature");
  }

  // Parse user object from the validated data
  const result: Record<string, string> = {};
  params.forEach((value, key) => { result[key] = value; });
  return result;
}

/**
 * Extract userId from validated initData string.
 * Returns null if initData is missing or invalid (in dev mode).
 */
export function getUserIdFromInitData(initData: string | null): string | null {
  if (!initData) return null;

  const isDev = process.env.NODE_ENV === "development";

  try {
    const data = validateInitData(initData);
    const user = JSON.parse(data.user ?? "{}");
    return user.id ? String(user.id) : null;
  } catch (err) {
    if (isDev) {
      // In dev, allow initData to be just a plain userId string for testing
      const parsed = parseInt(initData, 10);
      if (!isNaN(parsed)) return String(parsed);
    }
    console.warn("[validateInitData] failed:", err);
    return null;
  }
}
