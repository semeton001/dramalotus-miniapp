import crypto from "crypto";

const DEFAULT_TTL_SECONDS = 1800;

type StreamTokenPayload = {
  provider: string;
  userId: string;
  episodeKey: string;
  url: string;
  exp: number;
};

const tokenStore = new Map<string, StreamTokenPayload>();

function cleanup() {
  const now = Math.floor(Date.now() / 1000);

  for (const [key, value] of tokenStore.entries()) {
    if (value.exp < now) {
      tokenStore.delete(key);
    }
  }
}

export function createStreamToken(
  input: Omit<StreamTokenPayload, "exp">,
  ttlSeconds = DEFAULT_TTL_SECONDS,
) {
  cleanup();

  const token = crypto.randomBytes(12).toString("hex");

  tokenStore.set(token, {
    ...input,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  });

  return token;
}

export function verifyStreamToken(token: string) {
  cleanup();
  return tokenStore.get(token) || null;
}

export function isStreamTokenExpired(payload: StreamTokenPayload) {
  return payload.exp < Math.floor(Date.now() / 1000);
}
