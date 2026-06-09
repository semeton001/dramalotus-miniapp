import crypto from "crypto";

const SECRET = process.env.STREAM_TOKEN_SECRET || "";

if (!SECRET) {
  throw new Error("STREAM_TOKEN_SECRET missing");
}

const KEY = crypto.createHash("sha256").update(SECRET).digest();

type Payload = {
  u: string;
  exp: number;
  src: string;
  c?: string;
};

export function createStreamToken(payload: Payload): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function readStreamToken(token: string): Payload {
  const raw = Buffer.from(token, "base64url");

  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);

  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  const payload = JSON.parse(decrypted.toString("utf8"));

  if (!payload?.u || !payload?.exp) {
    throw new Error("invalid token");
  }

  if (Date.now() > payload.exp) {
    throw new Error("token expired");
  }

  return payload;
}
