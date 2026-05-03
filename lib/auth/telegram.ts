import crypto from "crypto";

export function verifyTelegramAuth(
  data: Record<string, string>,
  botToken: string
) {
  const { hash, ...rest } = data;

  if (!hash || !botToken) return false;

  const checkString = Object.keys(rest)
    .filter((key) => {
      const value = rest[key];
      return value !== undefined && value !== null && value !== "";
    })
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join("\n");

  const secretKey = crypto.createHash("sha256").update(botToken).digest();

  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(checkString)
    .digest("hex");

  return computedHash === hash;
}

export function parseTelegramInitData(initData: string): Record<string, string> {
  const params = new URLSearchParams(initData);
  const result: Record<string, string> = {};

  for (const [key, value] of params.entries()) {
    result[key] = value;
  }

  return result;
}

export function verifyTelegramWebAppInitData(
  initData: string,
  botToken: string
) {
  if (!initData || !botToken) return false;

  const data = parseTelegramInitData(initData);
  const { hash, ...rest } = data;

  if (!hash) return false;

  const checkString = Object.keys(rest)
    .filter((key) => {
      const value = rest[key];
      return value !== undefined && value !== null && value !== "";
    })
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(checkString)
    .digest("hex");

  return computedHash === hash;
}

