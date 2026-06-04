import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { FREE_EPISODE_LIMIT } from "@/lib/episodes/access";
import { isMiniappRequest } from "@/lib/auth/isMiniappRequest";
import { checkStreamRateLimit } from "@/lib/rate-limit/stream";
import { createStreamToken, verifyStreamToken } from "@/lib/stream/token";
import { buildFlickreelsApiUrl } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);


const FLICKREELS_STREAM_CACHE = new Map<
  string,
  { url: string; exp: number }
>();

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

type VerifiedStreamToken = NonNullable<ReturnType<typeof verifyStreamToken>>;

type FlickReelsStreamResponse = {
  status_code?: number;
  msg?: string;
  data?: {
    hls_url?: string;
    playlet_id?: string | number;
    chapter_id?: string | number;
    chapter_num?: string | number;
  };
};

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

function isLikelyPlaylist(contentType: string | null, url: URL): boolean {
  const lowerType = (contentType || "").toLowerCase();
  const pathname = url.pathname.toLowerCase();

  return (
    lowerType.includes("application/vnd.apple.mpegurl") ||
    lowerType.includes("application/x-mpegurl") ||
    pathname.endsWith(".m3u8")
  );
}

function buildProxyUrl(resolved: URL, parentPayload: VerifiedStreamToken): string {
  const token = createStreamToken({
    provider: parentPayload.provider,
    userId: parentPayload.userId,
    episodeKey: parentPayload.episodeKey,
    url: resolved.toString(),
  });

  return `/api/flickreels/stream?token=${encodeURIComponent(token)}`;
}

function rewritePlaylist(
  body: string,
  upstreamUrl: URL,
  parentPayload: VerifiedStreamToken,
): string {
  return body
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) return line;

      if (trimmed.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/g, (_match, uriValue: string) => {
          try {
            const resolved = new URL(uriValue, upstreamUrl);

            if (!ALLOWED_PROTOCOLS.has(resolved.protocol)) {
              return `URI="${uriValue}"`;
            }

            return `URI="${buildProxyUrl(resolved, parentPayload)}"`;
          } catch {
            return `URI="${uriValue}"`;
          }
        });
      }

      try {
        const resolved = new URL(trimmed, upstreamUrl);

        if (!ALLOWED_PROTOCOLS.has(resolved.protocol)) {
          return line;
        }

        return buildProxyUrl(resolved, parentPayload);
      } catch {
        return line;
      }
    })
    .join("\n");
}

function copyUpstreamHeaders(
  upstream: Response,
  contentType?: string | null,
): Headers {
  const headers = new Headers(buildCorsHeaders(contentType));

  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();

    if (HOP_BY_HOP_HEADERS.has(lower)) return;
    if (lower === "content-type" && contentType) return;
    if (lower === "access-control-allow-origin") return;
    if (lower === "access-control-allow-methods") return;
    if (lower === "access-control-allow-headers") return;
    if (lower === "access-control-expose-headers") return;

    headers.set(key, value);
  });

  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  headers.set("Cache-Control", "no-store");
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

  headers.set("Accept", "*/*");
  headers.set(
    "User-Agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  );
  headers.set("Accept-Language", "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7");
  headers.set("Origin", upstreamUrl.origin);
  headers.set("Referer", `${upstreamUrl.origin}/`);

  return headers;
}

async function resolveFlickReelsStreamUrl(
  dramaId: string,
  chapterId: string,
): Promise<string> {
  if (!dramaId.trim() || !chapterId.trim()) return "";

  const cacheKey = `${dramaId}:${chapterId}`;
  const cached = FLICKREELS_STREAM_CACHE.get(cacheKey);

  if (cached && cached.exp > Date.now()) {
    return cached.url;
  }

  const upstreamUrl = buildFlickreelsApiUrl(
    `/chapters/${encodeURIComponent(dramaId)}`,
  );

  const response = await fetch(upstreamUrl, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json,text/plain,*/*",
      Authorization: `Bearer ${process.env.FLICKREELS_TOKEN}`,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) return "";

  const payload = await response.json();
  const list = Array.isArray(payload?.data?.list)
    ? payload.data.list
    : [];

  const hit = list.find(
    (item: any) => String(item?.chapter_id) === String(chapterId),
  );

  const hlsUrl = hit?.hls_url;

  const finalUrl =
    typeof hlsUrl === "string" && hlsUrl.trim()
      ? hlsUrl.trim()
      : "";

  if (finalUrl) {
    FLICKREELS_STREAM_CACHE.set(cacheKey, {
      url: finalUrl,
      exp: Date.now() + 10 * 60 * 1000,
    });
  }

  return finalUrl;
}

async function requireFlickreelsAccess(request: NextRequest) {
  if (isMiniappRequest(request)) return null;

  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";

  if (token) {
    const payload = verifyStreamToken(token);

    if (payload && payload.provider === "flickreels") {
      return null;
    }
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: buildCorsHeaders("application/json") },
    );
  }
  const legacyUrl = request.nextUrl.searchParams.get("url")?.trim() ?? "";
  const legacyU = request.nextUrl.searchParams.get("u")?.trim() ?? "";

  if (legacyUrl || legacyU) {
    return NextResponse.json(
      { ok: false, error: "Direct URL playback is disabled." },
      { status: 403, headers: buildCorsHeaders("application/json") },
    );
  }

  const rateLimitError = checkStreamRateLimit({
    request,
    provider: "flickreels",
    userId: user.id,
  });
  if (rateLimitError) return rateLimitError;

  if (token) return null;

  const episodeNumber = Number(
    request.nextUrl.searchParams.get("episodeNumber") ||
      request.nextUrl.searchParams.get("episode") ||
      request.nextUrl.searchParams.get("ep") ||
      "1",
  );

  if (!Number.isInteger(episodeNumber) || episodeNumber < 1) {
    return NextResponse.json(
      { ok: false, error: "episodeNumber tidak valid." },
      { status: 400, headers: buildCorsHeaders("application/json") },
    );
  }

  const isFreeEpisode = episodeNumber <= FREE_EPISODE_LIMIT;

  if (!isFreeEpisode && user.membership_status !== "vip") {
    return NextResponse.json(
      {
        ok: false,
        error: "VIP_REQUIRED",
        message: "Episode ini hanya untuk VIP.",
      },
      { status: 403, headers: buildCorsHeaders("application/json") },
    );
  }

  if (user.membership_status === "vip" && user.vip_until) {
    const expiresAt = new Date(user.vip_until).getTime();

    if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) {
      return NextResponse.json(
        { ok: false, error: "VIP_EXPIRED" },
        { status: 403, headers: buildCorsHeaders("application/json") },
      );
    }
  }

  return null;
}

async function proxyMedia(
  request: NextRequest,
  rawUrl: string,
  parentPayload: VerifiedStreamToken,
) {
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

  const upstream = await fetch(upstreamUrl.toString(), {
    method: request.method === "HEAD" ? "HEAD" : "GET",
    headers: buildUpstreamHeaders(request, upstreamUrl),
    cache: "no-store",
    redirect: "follow",
  });

  const contentType = upstream.headers.get("content-type");

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");

    return new NextResponse(text || "Upstream request failed.", {
      status: upstream.status,
      headers: copyUpstreamHeaders(upstream, contentType),
    });
  }

  if (request.method === "HEAD") {
    return new NextResponse(null, {
      status: upstream.status,
      headers: copyUpstreamHeaders(
        upstream,
        isLikelyPlaylist(contentType, upstreamUrl)
          ? "application/vnd.apple.mpegurl; charset=utf-8"
          : contentType,
      ),
    });
  }

  if (isLikelyPlaylist(contentType, upstreamUrl)) {
    const playlistText = await upstream.text();
    const rewritten = rewritePlaylist(playlistText, upstreamUrl, parentPayload);

    return new NextResponse(rewritten, {
      status: upstream.status,
      headers: copyUpstreamHeaders(
        upstream,
        "application/vnd.apple.mpegurl; charset=utf-8",
      ),
    });
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: copyUpstreamHeaders(upstream, contentType),
  });
}

async function handleStream(request: NextRequest) {
  const isMiniapp = isMiniappRequest(request);
  const user = isMiniapp ? null : await getCurrentUser();

  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  const legacyUrl = request.nextUrl.searchParams.get("url")?.trim() ?? "";
  const legacyU = request.nextUrl.searchParams.get("u")?.trim() ?? "";

  if (legacyUrl || legacyU) {
    return NextResponse.json(
      { ok: false, error: "Direct URL playback is disabled." },
      { status: 403, headers: buildCorsHeaders("application/json") },
    );
  }

  if (token) {
    const payload = verifyStreamToken(token);

    if (
      !payload ||
      payload.provider !== "flickreels" ||
      (!isMiniapp && user && payload.userId !== user.id)
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired stream token" },
        { status: 403, headers: buildCorsHeaders("application/json") },
      );
    }

    return proxyMedia(request, payload.url, payload);
  }

  const dramaId = request.nextUrl.searchParams.get("dramaId")?.trim() || "";
  const chapterId =
    request.nextUrl.searchParams.get("chapterId")?.trim() ||
    request.nextUrl.searchParams.get("chapter_id")?.trim() ||
    request.nextUrl.searchParams.get("vid")?.trim() ||
    "";

  const episodeNumber =
    Number(
      request.nextUrl.searchParams.get("episodeNumber") ||
        request.nextUrl.searchParams.get("episode") ||
        request.nextUrl.searchParams.get("ep") ||
        "1",
    ) || 1;

  if (!dramaId || !chapterId) {
    return NextResponse.json(
      { error: "Missing required query parameter: dramaId+chapterId" },
      { status: 400, headers: buildCorsHeaders("application/json") },
    );
  }

  const resolvedUrl = await resolveFlickReelsStreamUrl(dramaId, chapterId);

  if (!resolvedUrl) {
    return NextResponse.json(
      { error: "Failed to resolve FlickReels stream" },
      { status: 404, headers: buildCorsHeaders("application/json") },
    );
  }

  const initialPayload: VerifiedStreamToken = {
    provider: "flickreels",
    userId: isMiniapp ? "miniapp" : user!.id,
    episodeKey: `${dramaId}:${chapterId}`,
    url: resolvedUrl,
    exp: Math.floor(Date.now() / 1000) + 180,
  };

  if (isMiniapp) {
    return proxyMedia(request, resolvedUrl, initialPayload);
  }

  const initialToken = createStreamToken({
    provider: initialPayload.provider,
    userId: initialPayload.userId,
    episodeKey: initialPayload.episodeKey,
    url: initialPayload.url,
  });

  return new NextResponse(null, {
    status: 307,
    headers: {
      Location: `/api/flickreels/stream?token=${encodeURIComponent(
        initialToken,
      )}`,
      ...buildCorsHeaders(),
    },
  });
}

export async function GET(request: NextRequest) {
  const accessError = await requireFlickreelsAccess(request);
  if (accessError) return accessError;

  return handleStream(request);
}

export async function HEAD(request: NextRequest) {
  const accessError = await requireFlickreelsAccess(request);
  if (accessError) return accessError;

  return handleStream(request);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(),
  });
}
