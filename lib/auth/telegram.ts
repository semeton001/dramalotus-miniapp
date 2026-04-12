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