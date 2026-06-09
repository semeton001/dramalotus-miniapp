import crypto from "crypto";

const DEFAULT_TTL_SECONDS = 1800;

const SECRET = process.env.STREAM_TOKEN_SECRET || "";

if (!SECRET) {
  throw new Error("STREAM_TOKEN_SECRET missing");
}

const KEY = crypto
  .createHash("sha256")
  .update(SECRET)
  .digest();

export type StreamTokenPayload = {
  provider: string;
  userId: string;
  episodeKey: string;
  url: string;
  exp: number;
};

export function createStreamToken(
  input: Omit<StreamTokenPayload, "exp">,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): string {
  const payload: StreamTokenPayload = {
    ...input,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };

  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    KEY,
    iv,
  );

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return Buffer.concat([
    iv,
    tag,
    encrypted,
  ]).toString("base64url");
}

export function verifyStreamToken(
  token: string,
): StreamTokenPayload | null {
  try {
    const raw = Buffer.from(token, "base64url");

    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      KEY,
      iv,
    );

    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    const payload = JSON.parse(
      decrypted.toString("utf8"),
    ) as StreamTokenPayload;

    if (
      !payload.provider ||
      !payload.url ||
      !payload.exp
    ) {
      return null;
    }

    if (
      payload.exp <
      Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function isStreamTokenExpired(
  payload: StreamTokenPayload,
) {
  return (
    payload.exp <
    Math.floor(Date.now() / 1000)
  );
}
