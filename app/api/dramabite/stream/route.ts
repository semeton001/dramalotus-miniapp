import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { FREE_EPISODE_LIMIT } from "@/lib/episodes/access";
import { isMiniappRequest } from "@/lib/auth/isMiniappRequest";
import { checkStreamRateLimit } from "@/lib/rate-limit/stream";
import { createStreamToken, verifyStreamToken } from "@/lib/stream/token";
import { fetchDramabiteJson } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type JsonRecord = Record<string, unknown>;
type VerifiedStreamToken = NonNullable<ReturnType<typeof verifyStreamToken>>;

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

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

function isLikelyPlaylist(contentType: string | null, url: URL): boolean {
  const lowerType = (contentType || "").toLowerCase();
  const pathname = url.pathname.toLowerCase();

  return (
    lowerType.includes("application/vnd.apple.mpegurl") ||
    lowerType.includes("application/x-mpegurl") ||
    lowerType.includes("audio/x-mpegurl") ||
    lowerType.includes("mpegurl") ||
    pathname.endsWith(".m3u8")
  );
}

function buildChildProxyUrl(
  resolved: URL,
  parentPayload: VerifiedStreamToken,
): string {
  const token = createStreamToken({
    provider: parentPayload.provider,
    userId: parentPayload.userId,
    episodeKey: parentPayload.episodeKey,
    url: resolved.toString(),
  });

  return `/api/dramabite/stream?token=${encodeURIComponent(token)}`;
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

            return `URI="${buildChildProxyUrl(resolved, parentPayload)}"`;
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

        return buildChildProxyUrl(resolved, parentPayload);
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

  headers.set("Accept", "*/*");
  headers.set("Origin", upstreamUrl.origin);
  headers.set("Referer", `${upstreamUrl.origin}/`);
  headers.set(
    "User-Agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  );

  if (range && !upstreamUrl.pathname.toLowerCase().endsWith(".m3u8")) {
    headers.set("Range", range);
  }

  return headers;
}

function extractDramabitePlayableUrl(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";

  const raw = payload as JsonRecord;

  const direct = raw.video;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const data = raw.data;
  if (data && typeof data === "object") {
    const record = data as JsonRecord;
    for (const key of ["video", "url", "hls", "hls_url", "play_url", "m3u8"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }

  for (const key of ["url", "hls", "hls_url", "play_url", "m3u8"]) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

async function resolveDramabiteStreamUrl(
  dramaId: string,
  episode: string,
): Promise<string> {
  if (!dramaId.trim() || !episode.trim()) return "";

  const payload = await fetchDramabiteJson(
    `/drama/${encodeURIComponent(dramaId)}/episode/${encodeURIComponent(
      episode,
    )}`,
    { quality: "default" },
  );

  return extractDramabitePlayableUrl(payload);
}

async function requireDramabiteAccess(request: NextRequest) {
  if (isMiniappRequest(request)) return null;

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: buildCorsHeaders("application/json") },
    );
  }

  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  const directUrl =
    request.nextUrl.searchParams.get("u")?.trim() ||
    request.nextUrl.searchParams.get("url")?.trim() ||
    "";

  if (directUrl) {
    return NextResponse.json(
      { ok: false, error: "Direct URL playback is disabled." },
      { status: 403, headers: buildCorsHeaders("application/json") },
    );
  }

  const rateLimitError = checkStreamRateLimit({
    request,
    provider: "dramabite",
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
  const directUrl =
    request.nextUrl.searchParams.get("u")?.trim() ||
    request.nextUrl.searchParams.get("url")?.trim() ||
    "";

  if (directUrl) {
    return NextResponse.json(
      { ok: false, error: "Direct URL playback is disabled." },
      { status: 403, headers: buildCorsHeaders("application/json") },
    );
  }

  if (token) {
    const payload = verifyStreamToken(token);

    if (
      !payload ||
      payload.provider !== "dramabite" ||
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
  const episode =
    request.nextUrl.searchParams.get("episode")?.trim() ||
    request.nextUrl.searchParams.get("ep")?.trim() ||
    request.nextUrl.searchParams.get("episodeNumber")?.trim() ||
    "";

  if (!dramaId || !episode) {
    return NextResponse.json(
      { error: "Missing DramaBite dramaId/episode." },
      { status: 400, headers: buildCorsHeaders("application/json") },
    );
  }

  const resolvedUrl = await resolveDramabiteStreamUrl(dramaId, episode);

  if (!resolvedUrl) {
    return NextResponse.json(
      { error: "Failed to resolve DramaBite stream." },
      { status: 404, headers: buildCorsHeaders("application/json") },
    );
  }

  const initialPayload: VerifiedStreamToken = {
    provider: "dramabite",
    userId: isMiniapp ? "miniapp" : user!.id,
    episodeKey: `${dramaId}:${episode}`,
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
      Location: `/api/dramabite/stream?token=${encodeURIComponent(initialToken)}`,
      ...buildCorsHeaders(),
    },
  });
}

export async function GET(request: NextRequest) {
  const accessError = await requireDramabiteAccess(request);
  if (accessError) return accessError;

  return handleStream(request);
}

export async function HEAD(request: NextRequest) {
  const accessError = await requireDramabiteAccess(request);
  if (accessError) return accessError;

  return handleStream(request);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(),
  });
}
