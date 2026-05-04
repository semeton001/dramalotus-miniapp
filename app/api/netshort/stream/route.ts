import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { FREE_EPISODE_LIMIT } from "@/lib/episodes/access";
import { createStreamToken, verifyStreamToken } from "@/lib/stream/token";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { Readable } from "node:stream";
import { checkStreamRateLimit } from "@/lib/rate-limit/stream";
import { isMiniappRequest } from "@/lib/auth/isMiniappRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

const NETSHORT_EPISODE_BASE_URL =
  "https://streamapi.web.id/p/netshort/api/v1/episode";

const NETSHORT_TOKEN = process.env.NETSHORT_TOKEN?.trim() || "";

type StreamapiNetshortEpisodeResponse = {
  code?: number;
  data?: {
    episodeId?: string | number;
    videos?: Array<{
      quality?: string;
      url?: string;
    }>;
    subtitles?: Array<{
      url?: string;
      language?: string;
      label?: string;
    }>;
  };
};

type VerifiedStreamToken = NonNullable<ReturnType<typeof verifyStreamToken>>;

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

function encodeUrlToken(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeUrlToken(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
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

function isValidDecodedUrl(value: string): boolean {
  if (!value || value.trim().length === 0) return false;

  try {
    const url = new URL(value);
    return ALLOWED_PROTOCOLS.has(url.protocol) && !!url.hostname;
  } catch {
    return false;
  }
}

function isTlsCertError(error: unknown): boolean {
  const code =
    error &&
    typeof error === "object" &&
    "cause" in error &&
    error.cause &&
    typeof error.cause === "object" &&
    "code" in error.cause
      ? String((error.cause as { code?: unknown }).code)
      : "";

  return (
    code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
    code === "SELF_SIGNED_CERT_IN_CHAIN" ||
    code === "CERT_HAS_EXPIRED"
  );
}

function toProxyUrl(
  resolved: URL,
  request: NextRequest,
  parentPayload: VerifiedStreamToken,
): string {
  const proxyBase = new URL("/api/netshort/stream", request.url);
  const childToken = createStreamToken({
    provider: parentPayload.provider,
    userId: parentPayload.userId,
    episodeKey: parentPayload.episodeKey,
    url: resolved.toString(),
  });

  proxyBase.searchParams.set("token", childToken);
  return proxyBase.toString();
}

function rewriteDirectiveUris(
  line: string,
  upstreamUrl: URL,
  request: NextRequest,
  parentPayload: VerifiedStreamToken,
): string {
  return line.replace(/URI="([^"]+)"/g, (_match, uriValue: string) => {
    try {
      const resolved = new URL(uriValue, upstreamUrl);

      if (!ALLOWED_PROTOCOLS.has(resolved.protocol)) {
        return `URI="${uriValue}"`;
      }

      return `URI="${toProxyUrl(resolved, request, parentPayload)}"`;
    } catch {
      return `URI="${uriValue}"`;
    }
  });
}

function rewritePlaylist(
  body: string,
  upstreamUrl: URL,
  request: NextRequest,
  parentPayload: VerifiedStreamToken,
): string {
  return body
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) return line;

      if (trimmed.startsWith("#")) {
        return rewriteDirectiveUris(line, upstreamUrl, request, parentPayload);
      }

      try {
        const resolved = new URL(trimmed, upstreamUrl);

        if (!ALLOWED_PROTOCOLS.has(resolved.protocol)) {
          return line;
        }

        return toProxyUrl(resolved, request, parentPayload);
      } catch {
        return line;
      }
    })
    .join("\n");
}

function copyUpstreamHeadersFromWebResponse(
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

  headers.set("Cache-Control", "public, max-age=15, s-maxage=30");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Range");
  headers.set(
    "Access-Control-Expose-Headers",
    "Content-Length, Content-Range, Accept-Ranges, Content-Type",
  );

  return headers;
}

function copyUpstreamHeadersFromNodeHeaders(
  rawHeaders: Record<string, string>,
  contentType?: string | null,
): Headers {
  const headers = new Headers(buildCorsHeaders(contentType));

  for (const [key, value] of Object.entries(rawHeaders)) {
    const lower = key.toLowerCase();

    if (HOP_BY_HOP_HEADERS.has(lower)) continue;
    if (lower === "access-control-allow-origin") continue;
    if (lower === "access-control-allow-methods") continue;
    if (lower === "access-control-allow-headers") continue;
    if (lower === "access-control-expose-headers") continue;

    headers.set(key, value);
  }

  headers.set("Cache-Control", "public, max-age=15, s-maxage=30");
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

async function fetchUpstreamWithInsecureTls(
  request: NextRequest,
  upstreamUrl: URL,
  redirectCount = 0,
): Promise<{
  status: number;
  headers: Record<string, string>;
  body: Readable | null;
}> {
  if (redirectCount > 5) {
    throw new Error("Too many redirects.");
  }

  const isHttps = upstreamUrl.protocol === "https:";
  const client = isHttps ? httpsRequest : httpRequest;
  const headerMap = Object.fromEntries(
    buildUpstreamHeaders(request, upstreamUrl),
  );

  return await new Promise((resolve, reject) => {
    const req = client(
      upstreamUrl,
      {
        method: request.method === "HEAD" ? "HEAD" : "GET",
        rejectUnauthorized: false,
        headers: headerMap,
      },
      (res) => {
        const status = res.statusCode || 500;
        const location = res.headers.location;

        if (location && [301, 302, 303, 307, 308].includes(status)) {
          const nextUrl = new URL(location, upstreamUrl);
          res.resume();
          fetchUpstreamWithInsecureTls(request, nextUrl, redirectCount + 1)
            .then(resolve)
            .catch(reject);
          return;
        }

        const headers: Record<string, string> = {};
        for (const [key, value] of Object.entries(res.headers)) {
          if (typeof value === "string") {
            headers[key.toLowerCase()] = value;
          } else if (Array.isArray(value)) {
            headers[key.toLowerCase()] = value.join(", ");
          }
        }

        resolve({
          status,
          headers,
          body: request.method === "HEAD" ? null : (res as unknown as Readable),
        });
      },
    );

    req.on("error", reject);
    req.end();
  });
}

function pickBestNetshortVideoUrl(
  payload: StreamapiNetshortEpisodeResponse,
): string {
  const videos = Array.isArray(payload.data?.videos) ? payload.data.videos : [];

  const byQuality = (quality: string) =>
    videos.find(
      (video) =>
        typeof video.quality === "string" &&
        video.quality.toLowerCase() === quality &&
        typeof video.url === "string" &&
        video.url.trim().length > 0,
    )?.url?.trim() || "";

  return (
    byQuality("1080p") ||
    byQuality("720p") ||
    byQuality("540p") ||
    videos.find(
      (video) =>
        typeof video.url === "string" && video.url.trim().length > 0,
    )?.url?.trim() ||
    ""
  );
}

async function resolveNetshortEpisodeVideoUrl(
  dramaId: string,
  episodeNo: string,
): Promise<string> {
  const upstreamUrl = `${NETSHORT_EPISODE_BASE_URL}/${encodeURIComponent(
    dramaId,
  )}/${encodeURIComponent(episodeNo)}?lang=id_ID&token=${NETSHORT_TOKEN}`;

  const response = await fetch(upstreamUrl, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Netshort episode failed: ${response.status}`);
  }

  const payload = (await response.json()) as StreamapiNetshortEpisodeResponse;
  const videoUrl = pickBestNetshortVideoUrl(payload);

  if (!videoUrl) {
    throw new Error("Netshort episode video URL not found.");
  }

  return videoUrl;
}

async function handleProxy(request: NextRequest) {
  const isMiniapp = isMiniappRequest(request);
  const user = isMiniapp ? null : await getCurrentUser();

  if (!isMiniapp && !user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: buildCorsHeaders("application/json") },
    );
  }

  const streamToken = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  const rawToken = request.nextUrl.searchParams.get("u")?.trim();
  const rawLegacyUrl = request.nextUrl.searchParams.get("url")?.trim();
  const dramaId = request.nextUrl.searchParams.get("dramaId")?.trim() || "";
  const episodeNo = request.nextUrl.searchParams.get("episodeNo")?.trim() || "";

  let rawUrl = "";
  let parentPayload: VerifiedStreamToken | null = null;

  if (streamToken) {
    const tokenPayload = verifyStreamToken(streamToken);

    if (
      !tokenPayload ||
      tokenPayload.provider !== "netshort" ||
      !isMiniapp &&
      user &&
      tokenPayload.userId !== user.id
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired stream token" },
        { status: 403, headers: buildCorsHeaders("application/json") },
      );
    }

    rawUrl = tokenPayload.url;
    parentPayload = tokenPayload;
  } else if (rawToken || rawLegacyUrl) {
    return NextResponse.json(
      { ok: false, error: "Direct URL playback is disabled." },
      { status: 403, headers: buildCorsHeaders("application/json") },
    );
  } else if (dramaId && episodeNo) {
    rawUrl = await resolveNetshortEpisodeVideoUrl(dramaId, episodeNo);

    const initialPayload: VerifiedStreamToken = {
      provider: "netshort",
      userId: isMiniapp ? "miniapp" : user!.id,
      episodeKey: `${dramaId}:${episodeNo}`,
      url: rawUrl,
      exp: Math.floor(Date.now() / 1000) + 180,
    };

    const isMiniappRequest = request.nextUrl.searchParams.get("miniapp") === "1";

    if (isMiniappRequest) {
      parentPayload = initialPayload;
    } else {
      const initialToken = createStreamToken({
        provider: initialPayload.provider,
        userId: initialPayload.userId,
        episodeKey: initialPayload.episodeKey,
        url: initialPayload.url,
      });

      const tokenUrl = `/api/netshort/stream?token=${encodeURIComponent(initialToken)}`;

      return new NextResponse(null, {
        status: 307,
        headers: {
          Location: tokenUrl,
          ...buildCorsHeaders(),
        },
      });
    }
  }

  if (!rawUrl || !parentPayload) {
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

  try {
    const upstreamResponse = await fetchUpstream(request, upstreamUrl);
    const contentType = upstreamResponse.headers.get("content-type");

    if (!upstreamResponse.ok) {
      const text = await upstreamResponse.text().catch(() => "");

      return new NextResponse(text || "Upstream request failed.", {
        status: upstreamResponse.status,
        headers: copyUpstreamHeadersFromWebResponse(
          upstreamResponse,
          contentType,
        ),
      });
    }

    if (request.method === "HEAD") {
      return new NextResponse(null, {
        status: upstreamResponse.status,
        headers: copyUpstreamHeadersFromWebResponse(
          upstreamResponse,
          contentType,
        ),
      });
    }

    if (isLikelyPlaylist(contentType, upstreamUrl)) {
      const playlistText = await upstreamResponse.text();
      const rewritten = rewritePlaylist(
        playlistText,
        upstreamUrl,
        request,
        parentPayload,
      );

      return new NextResponse(rewritten, {
        status: upstreamResponse.status,
        headers: copyUpstreamHeadersFromWebResponse(
          upstreamResponse,
          "application/vnd.apple.mpegurl",
        ),
      });
    }

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: copyUpstreamHeadersFromWebResponse(
        upstreamResponse,
        contentType,
      ),
    });
  } catch (error) {
    if (!isTlsCertError(error)) {
      throw error;
    }

    const fallback = await fetchUpstreamWithInsecureTls(request, upstreamUrl);
    const contentType = fallback.headers["content-type"] || "";

    if (request.method === "HEAD") {
      return new NextResponse(null, {
        status: fallback.status,
        headers: copyUpstreamHeadersFromNodeHeaders(
          fallback.headers,
          contentType,
        ),
      });
    }

    if (isLikelyPlaylist(contentType, upstreamUrl) && fallback.body) {
      const chunks: Buffer[] = [];

      for await (const chunk of fallback.body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      const playlistText = Buffer.concat(chunks).toString("utf8");
      const rewritten = rewritePlaylist(
        playlistText,
        upstreamUrl,
        request,
        parentPayload,
      );

      return new NextResponse(rewritten, {
        status: fallback.status,
        headers: copyUpstreamHeadersFromNodeHeaders(
          fallback.headers,
          "application/vnd.apple.mpegurl",
        ),
      });
    }

    let responseBody: ArrayBuffer | null = null;

    if (fallback.body) {
      const chunks: Buffer[] = [];

      for await (const chunk of fallback.body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      const bodyBuffer = Buffer.concat(chunks);

      responseBody = bodyBuffer.buffer.slice(
        bodyBuffer.byteOffset,
        bodyBuffer.byteOffset + bodyBuffer.byteLength,
      ) as ArrayBuffer;
    }

    return new NextResponse(responseBody, {
      status: fallback.status,
      headers: copyUpstreamHeadersFromNodeHeaders(
        fallback.headers,
        contentType,
      ),
    });
  }
}


async function requireNetshortAccess(request: NextRequest) {
  if (isMiniappRequest(request)) return null;

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: buildCorsHeaders("application/json") },
    );
  }

  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  const proxyToken = request.nextUrl.searchParams.get("u")?.trim() ?? "";
  const legacyUrl = request.nextUrl.searchParams.get("url")?.trim() ?? "";

  if (token) {
    return null;
  }

  if (proxyToken || legacyUrl) {
    return NextResponse.json(
      { ok: false, error: "Direct URL playback is disabled." },
      { status: 403, headers: buildCorsHeaders("application/json") },
    );
  }

  const episodeNo = request.nextUrl.searchParams.get("episodeNo")?.trim() || "";
  const episodeNumber = Number(episodeNo);

  if (!Number.isInteger(episodeNumber) || episodeNumber < 1) {
    return NextResponse.json(
      { ok: false, error: "episodeNo tidak valid." },
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

export async function GET(request: NextRequest) {
  const accessError = await requireNetshortAccess(request);
  if (accessError) return accessError;

  try {
    return await handleProxy(request);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to proxy stream.",
      },
      { status: 500, headers: buildCorsHeaders("application/json") },
    );
  }
}

export async function HEAD(request: NextRequest) {
  const accessError = await requireNetshortAccess(request);
  if (accessError) return accessError;

  try {
    return await handleProxy(request);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to proxy stream.",
      },
      { status: 500, headers: buildCorsHeaders("application/json") },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(),
  });
}
