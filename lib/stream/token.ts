import crypto from "crypto";

const DEFAULT_TTL_SECONDS = 180;
const TOKEN_VERSION = "v2";

type StreamTokenPayload = {
  provider: string;
  userId: string;
  episodeKey: string;
  url: string;
  exp: number;
};

function getSecret() {
  const secret = process.env.STREAM_TOKEN_SECRET;

  if (!secret || secret.trim().length < 32) {
    throw new Error("STREAM_TOKEN_SECRET is missing or too short");
  }

  return secret.trim();
}

function getEncryptionKey() {
  return crypto.createHash("sha256").update(getSecret()).digest();
}

function base64UrlEncode(value: Buffer) {
  return value.toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url");
}

export function createStreamToken(
  input: Omit<StreamTokenPayload, "exp">,
  ttlSeconds = DEFAULT_TTL_SECONDS,
) {
  const payload: StreamTokenPayload = {
    ...input,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);

  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    TOKEN_VERSION,
    base64UrlEncode(iv),
    base64UrlEncode(encrypted),
    base64UrlEncode(authTag),
  ].join(".");
}

export function verifyStreamToken(token: string) {
  const [version, encodedIv, encodedEncrypted, encodedAuthTag] = token.split(".");

  if (
    version !== TOKEN_VERSION ||
    !encodedIv ||
    !encodedEncrypted ||
    !encodedAuthTag
  ) {
    return null;
  }

  let payload: StreamTokenPayload;

  try {
    const iv = base64UrlDecode(encodedIv);
    const encrypted = base64UrlDecode(encodedEncrypted);
    const authTag = base64UrlDecode(encodedAuthTag);

    if (iv.length !== 12 || authTag.length !== 16) {
      return null;
    }

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      getEncryptionKey(),
      iv,
    );

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    payload = JSON.parse(decrypted.toString("utf8")) as StreamTokenPayload;
  } catch {
    return null;
  }

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  if (
    typeof payload.provider !== "string" ||
    typeof payload.userId !== "string" ||
    typeof payload.episodeKey !== "string" ||
    typeof payload.url !== "string" ||
    !payload.provider ||
    !payload.userId ||
    !payload.episodeKey ||
    !payload.url
  ) {
    return null;
  }

  return payload;
}
