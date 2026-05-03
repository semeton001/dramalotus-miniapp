import { NextRequest, NextResponse } from "next/server";

type Bucket = {
  count: number;
  resetAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __dramalotusStreamRateLimitBuckets:
    | Map<string, Bucket>
    | undefined;
}

const WINDOW_MS = 5 * 60 * 1000;
const DEFAULT_MAX_REQUESTS = 600;

function getBuckets() {
  if (!globalThis.__dramalotusStreamRateLimitBuckets) {
    globalThis.__dramalotusStreamRateLimitBuckets = new Map<string, Bucket>();
  }

  return globalThis.__dramalotusStreamRateLimitBuckets;
}

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const realIp = request.headers.get("x-real-ip") || "";

  return (
    forwardedFor.split(",")[0]?.trim() ||
    realIp.trim() ||
    "unknown-ip"
  );
}

function getMaxRequests() {
  const value = Number(process.env.STREAM_RATE_LIMIT_MAX || "");

  return Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : DEFAULT_MAX_REQUESTS;
}

export function checkStreamRateLimit({
  request,
  provider,
  userId,
}: {
  request: NextRequest;
  provider: string;
  userId: string;
}) {
  const now = Date.now();
  const buckets = getBuckets();
  const maxRequests = getMaxRequests();
  const clientIp = getClientIp(request);
  const key = `${provider}:${userId || clientIp}`;

  for (const [bucketKey, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(bucketKey);
    }
  }

  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });

    return null;
  }

  current.count += 1;

  if (current.count > maxRequests) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));

    return NextResponse.json(
      {
        ok: false,
        error: "RATE_LIMITED",
        message: "Terlalu banyak request stream. Coba lagi sebentar.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return null;
}
