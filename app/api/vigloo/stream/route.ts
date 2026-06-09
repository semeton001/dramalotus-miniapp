import { NextRequest, NextResponse } from "next/server";
import { createStreamToken } from "@/lib/stream-token";
import { buildViglooApiUrl, VIGLOO_HEADERS } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const revalidate = 0;

const VIGLOO_STREAM_CACHE = new Map<
  string,
  {
    url: string;
    cookieHeader: string;
    exp: number;
  }
>();

function getCachedStream(key: string) {
  const hit = VIGLOO_STREAM_CACHE.get(key);

  if (!hit) return null;

  if (hit.exp < Date.now()) {
    VIGLOO_STREAM_CACHE.delete(key);
    return null;
  }

  return hit;
}


export async function GET(request: NextRequest) {
  try {
    
const cacheKey =
  `${request.nextUrl.searchParams.get("seasonId") || ""}:` +
  `${request.nextUrl.searchParams.get("ep") || "1"}`;

const cached = getCachedStream(cacheKey);

if (cached) {


const st = createStreamToken({

    u: cached.url,
    c: cached.cookieHeader,
    exp: Date.now() + 300000,
    src: "vigloo",
  });

  return NextResponse.json({
    ok: true,
    url: `/api/vigloo/play?st=${encodeURIComponent(st)}`,
  });
}

const seasonId =

      request.nextUrl.searchParams.get("seasonId")?.trim() || "";

    const ep =
      request.nextUrl.searchParams.get("ep")?.trim() || "1";

    if (!seasonId) {
      return NextResponse.json(
        { ok: false, error: "Missing seasonId" },
        { status: 400 },
      );
    }

    const targetUrl = buildViglooApiUrl(
      `/vigloo/api/v1/play?seasonId=${encodeURIComponent(
        seasonId,
      )}&ep=${encodeURIComponent(ep)}`,
    );

    const upstream = await fetch(targetUrl, {
      cache: "no-store",
      headers: VIGLOO_HEADERS,
    });

    const text = await upstream.text();

    let json: any = null;

    try {
      json = JSON.parse(text);
    } catch {}

    const payload = json?.payload || {};

    const url =
      typeof payload.url === "string"
        ? payload.url.trim()
        : "";

    const cookies = payload.cookies || {};

    const cookieString = [
      cookies["CloudFront-Policy"]
        ? `CloudFront-Policy=${cookies["CloudFront-Policy"]}`
        : "",
      cookies["CloudFront-Signature"]
        ? `CloudFront-Signature=${cookies["CloudFront-Signature"]}`
        : "",
      cookies["CloudFront-Key-Pair-Id"]
        ? `CloudFront-Key-Pair-Id=${cookies["CloudFront-Key-Pair-Id"]}`
        : "",
    ]
      .filter(Boolean)
      .join("; ");

    if (!url) {
      return NextResponse.json(
        {
          ok: false,
          error: "No stream url",
          targetUrl,
          upstreamStatus: upstream.status,
          upstream: json,
          rawPreview: text.slice(0, 300),
        },
        { status: 404 },
      );
    }

    VIGLOO_STREAM_CACHE.set(cacheKey, {
      url,
      cookieHeader: cookieString,
      exp: Date.now() + 300000,
    });


    const st = createStreamToken({
      u: url,
      c: cookieString,
      exp: Date.now() + 300000,
      src: "vigloo",
    });

    return NextResponse.json({
      ok: true,
      url: `/api/vigloo/play?st=${encodeURIComponent(st)}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}
