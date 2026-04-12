import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".m4v", ".mov"];
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-encoding",
  "content-length",
  "host",
]);

function buildCorsHeaders(contentType?: string | null) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Range",
    "Access-Control-Expose-Headers":
      "Content-Length, Content-Range, Accept-Ranges, Content-Type",
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

function decodeUrlToken(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function isValidDecodedUrl(value: string): boolean {
  if (!value || value.trim().length === 0) return false;

  try {
    const url = new URL(value);
    return ALLOWED_PROTOCOLS.has(url.protocol) && !!url.hostname;
  } catch {
    return false;
  }
}

function isAllowedVideoUrl(url: URL): boolean {
  const pathname = url.pathname.toLowerCase();
  return ALLOWED_VIDEO_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

function copyUpstreamHeaders(
  upstream: Response,
  contentType?: string | null,
): Headers {
  const headers = new Headers(buildCorsHeaders(contentType));

  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();

    if (HOP_BY_HOP_HEADERS.has(lower)) return;
    if (lower === "access-control-allow-origin") return;
    if (lower === "access-control-allow-methods") return;
    if (lower === "access-control-allow-headers") return;
    if (lower === "access-control-expose-headers") return;

    headers.set(key, value);
  });

  headers.set("Cache-Control", "public, max-age=60, s-maxage=120");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Range");
  headers.set(
    "Access-Control-Expose-Headers",
    "Content-Length, Content-Range, Accept-Ranges, Content-Type",
  );

  return headers;
}

function buildUpstreamHeaders(request: NextRequest, upstreamUrl: URL): Headers {
  const headers = new Headers();
  const range = request.headers.get("range");

  if (range) {
    headers.set("Range", range);
  }

  headers.set(
    "User-Agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  );
  headers.set("Accept", "*/*");
  headers.set("Accept-Language", "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7");
  headers.set("Origin", upstreamUrl.origin);
  headers.set("Referer", `${upstreamUrl.origin}/`);
  headers.set("Sec-Fetch-Dest", "video");
  headers.set("Sec-Fetch-Mode", "cors");
  headers.set("Sec-Fetch-Site", "cross-site");

  return headers;
}

async function fetchUpstream(
  request: NextRequest,
  upstreamUrl: URL,
): Promise<Response> {
  const headers = buildUpstreamHeaders(request, upstreamUrl);

  return fetch(upstreamUrl.toString(), {
    method: request.method === "HEAD" ? "HEAD" : "GET",
    headers,
    cache: "no-store",
    redirect: "follow",
  });
}

async function handleProxy(request: NextRequest) {
  const rawToken = request.nextUrl.searchParams.get("u")?.trim();
  const rawLegacyUrl = request.nextUrl.searchParams.get("url")?.trim();

  let rawUrl = "";

  if (rawToken) {
    try {
      rawUrl = decodeUrlToken(rawToken).trim();
    } catch {
      return NextResponse.json(
        { error: "Invalid u token." },
        { status: 400, headers: buildCorsHeaders("application/json") },
      );
    }
  } else if (rawLegacyUrl) {
    rawUrl = rawLegacyUrl;
  }

  if (!rawUrl) {
    return NextResponse.json(
      { error: "Missing required query parameter: u or url" },
      { status: 400, headers: buildCorsHeaders("application/json") },
    );
  }

  if (!isValidDecodedUrl(rawUrl)) {
    return NextResponse.json(
      { error: "Decoded URL is invalid or incomplete." },
      { status: 400, headers: buildCorsHeaders("application/json") },
    );
  }

  let upstreamUrl: URL;

  try {
    upstreamUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json(
      { error: "Invalid upstream URL." },
      { status: 400, headers: buildCorsHeaders("application/json") },
    );
  }

  if (!ALLOWED_PROTOCOLS.has(upstreamUrl.protocol)) {
    return NextResponse.json(
      { error: "Unsupported protocol." },
      { status: 400, headers: buildCorsHeaders("application/json") },
    );
  }

  if (!isAllowedVideoUrl(upstreamUrl)) {
    return NextResponse.json(
      { error: "Unsupported video path." },
      { status: 400, headers: buildCorsHeaders("application/json") },
    );
  }

  const upstreamResponse = await fetchUpstream(request, upstreamUrl);
  const contentType = upstreamResponse.headers.get("content-type");

  if (!upstreamResponse.ok) {
    const text = await upstreamResponse.text().catch(() => "");

    return new NextResponse(text || "Upstream request failed.", {
      status: upstreamResponse.status,
      headers: copyUpstreamHeaders(upstreamResponse, contentType),
    });
  }

  if (request.method == "HEAD") {
    return new NextResponse(null, {
      status: upstreamResponse.status,
      headers: copyUpstreamHeaders(upstreamResponse, contentType),
    });
  }

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: copyUpstreamHeaders(upstreamResponse, contentType),
  });
}

export async function GET(request: NextRequest) {
  return handleProxy(request);
}

export async function HEAD(request: NextRequest) {
  return handleProxy(request);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(),
  });
}
