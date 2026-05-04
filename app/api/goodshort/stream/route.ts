import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { FREE_EPISODE_LIMIT } from "@/lib/episodes/access";
import { isMiniappRequest } from "@/lib/auth/isMiniappRequest";
import { checkStreamRateLimit } from "@/lib/rate-limit/stream";
import { createStreamToken, verifyStreamToken } from "@/lib/stream/token";
import { fetchGoodshortJson, jsonError } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const INTERNAL_PROTOCOL = "goodshort:";

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

type GoodshortPlayResponse = {
  success?: boolean;
  episode?: string;
  m3u8?: string;
  k?: string;
  s?: string;
};

type GoodshortWrappedUrl = {
  url: string;
  videoKey: string;
  videoSalt: string;
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

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function isAllowedGoodshortHost(hostname: string): boolean {
  const host = hostname.toLowerCase();

  return (
    host.includes("goodshort") ||
    host.includes("goodreels") ||
    host.includes("dramabos.my.id") ||
    host.includes("acfs") ||
    host.includes("v3.goodshort.com")
  );
}

function normalizeIncomingTargetUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);

    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      parsed.protocol = "https:";
      parsed.host = "goodshort.dramabos.my.id";
      return parsed.toString();
    }

    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function shouldTreatAsPlaylist(url: string, contentType: string): boolean {
  const lowerUrl = url.toLowerCase();
  const lowerType = contentType.toLowerCase();

  return (
    lowerUrl.includes(".m3u8") ||
    lowerType.includes("application/vnd.apple.mpegurl") ||
    lowerType.includes("application/x-mpegurl") ||
    lowerType.includes("audio/mpegurl") ||
    lowerType.includes("audio/x-mpegurl")
  );
}

function parseDataUrl(
  dataUrl: string,
): { contentType: string; body: ArrayBuffer } | null {
  const match = dataUrl.match(/^data:([^,]*?),(.*)$/i);
  if (!match) return null;

  const meta = match[1] || "";
  const payload = match[2] || "";
  const isBase64 = /;base64/i.test(meta);
  const contentType =
    meta.replace(/;base64/i, "").trim() || "application/octet-stream";

  try {
    if (isBase64) {
      const binary = atob(payload);
      const bytes = new Uint8Array(binary.length);

      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }

      return {
        contentType,
        body: bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ) as ArrayBuffer,
      };
    }

    const decoded = decodeURIComponent(payload);
    const encoded = new TextEncoder().encode(decoded);

    return {
      contentType,
      body: encoded.buffer.slice(
        encoded.byteOffset,
        encoded.byteOffset + encoded.byteLength,
      ) as ArrayBuffer,
    };
  } catch {
    return null;
  }
}

function maybeBuildVideoKeyDataUrl(videoKey: string, videoSalt = ""): string {
  const trimmed = videoKey.trim();
  const salt = videoSalt.trim();

  if (!trimmed) return "";
  if (trimmed.startsWith("data:")) return trimmed;

  try {
    const binary = atob(trimmed);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    if (salt) {
      const saltBytes = new TextEncoder().encode(salt);
      const xored = new Uint8Array(bytes.length);

      for (let i = 0; i < bytes.length; i += 1) {
        xored[i] = bytes[i] ^ saltBytes[i % saltBytes.length];
      }

      const hexText = new TextDecoder().decode(xored).trim();

      if (/^[0-9a-f]{32}$/i.test(hexText)) {
        const keyBytes = new Uint8Array(16);

        for (let i = 0; i < 16; i += 1) {
          keyBytes[i] = Number.parseInt(hexText.slice(i * 2, i * 2 + 2), 16);
        }

        let keyBinary = "";
        keyBytes.forEach((byte) => {
          keyBinary += String.fromCharCode(byte);
        });

        return `data:application/octet-stream;base64,${btoa(keyBinary)}`;
      }
    }

    const normalizedBytes = bytes.length > 16 ? bytes.slice(0, 16) : bytes;
    let normalizedBinary = "";

    normalizedBytes.forEach((byte) => {
      normalizedBinary += String.fromCharCode(byte);
    });

    return `data:application/octet-stream;base64,${btoa(normalizedBinary)}`;
  } catch {
    return `data:application/octet-stream;base64,${trimmed}`;
  }
}

function wrapGoodshortUrl(
  url: string,
  videoKey = "",
  videoSalt = "",
): string {
  const wrapped = new URL("goodshort://stream");
  wrapped.searchParams.set("url", url);
  if (videoKey) wrapped.searchParams.set("videoKey", videoKey);
  if (videoSalt) wrapped.searchParams.set("videoSalt", videoSalt);
  return wrapped.toString();
}

function unwrapGoodshortUrl(value: string): GoodshortWrappedUrl {
  try {
    const parsed = new URL(value);

    if (parsed.protocol !== INTERNAL_PROTOCOL) {
      return { url: value, videoKey: "", videoSalt: "" };
    }

    return {
      url: parsed.searchParams.get("url") || "",
      videoKey: parsed.searchParams.get("videoKey") || "",
      videoSalt: parsed.searchParams.get("videoSalt") || "",
    };
  } catch {
    return { url: value, videoKey: "", videoSalt: "" };
  }
}

function createChildProxyUrl(
  rawUrl: string,
  parentPayload: VerifiedStreamToken,
  videoKey = "",
  videoSalt = "",
): string {
  const tokenUrl =
    rawUrl.startsWith("local://") || rawUrl.startsWith("data:")
      ? wrapGoodshortUrl(rawUrl, videoKey, videoSalt)
      : rawUrl;

  const token = createStreamToken({
    provider: parentPayload.provider,
    userId: parentPayload.userId,
    episodeKey: parentPayload.episodeKey,
    url: tokenUrl,
  });

  return `/api/goodshort/stream?token=${encodeURIComponent(token)}`;
}

function absolutizeUrl(line: string, playlistUrl: string): string {
  if (line.startsWith("http://") || line.startsWith("https://")) {
    return line;
  }

  if (line.startsWith("data:") || line.startsWith("local://")) {
    return line;
  }

  const base = new URL(playlistUrl);
  const absolute = line.startsWith("/")
    ? new URL(`${base.protocol}//${base.host}${line}`)
    : new URL(line, playlistUrl);

  if (!absolute.search && base.search) {
    absolute.search = base.search;
  }

  return absolute.toString();
}

function rewriteGoodshortPlaylist(
  content: string,
  playlistUrl: string,
  parentPayload: VerifiedStreamToken,
  videoKey = "",
  videoSalt = "",
): string {
  return content
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) return line;

      if (trimmed.startsWith("#")) {
        if (!trimmed.includes('URI="')) return line;

        return line.replace(/URI="([^"]+)"/g, (_match, uri: string) => {
          try {
            const absolute = absolutizeUrl(uri, playlistUrl);
            return `URI="${createChildProxyUrl(
              absolute,
              parentPayload,
              videoKey,
              videoSalt,
            )}"`;
          } catch {
            return `URI="${uri}"`;
          }
        });
      }

      try {
        const absolute = absolutizeUrl(trimmed, playlistUrl);
        return createChildProxyUrl(absolute, parentPayload, videoKey, videoSalt);
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

function buildUpstreamHeaders(request: NextRequest, targetUrl: URL): Headers {
  const headers = new Headers();
  const range = request.headers.get("range");

  headers.set("Accept", "*/*");
  headers.set("Origin", `${targetUrl.protocol}//${targetUrl.host}`);
  headers.set("Referer", `${targetUrl.protocol}//${targetUrl.host}/`);
  headers.set(
    "User-Agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  );

  if (range && !targetUrl.toString().toLowerCase().includes(".m3u8")) {
    headers.set("Range", range);
  }

  return headers;
}

async function resolveGoodshortPlay(
  bookId: string,
  chapterId: string,
  quality: string,
): Promise<{ url: string; videoKey: string; videoSalt: string }> {
  if (!bookId.trim() || !chapterId.trim()) {
    return { url: "", videoKey: "", videoSalt: "" };
  }

  const payload = (await fetchGoodshortJson(
    `/play/${encodeURIComponent(bookId)}/${encodeURIComponent(chapterId)}`,
    {
      q: quality || "720p",
    },
  )) as GoodshortPlayResponse;

  return {
    url: typeof payload?.m3u8 === "string" ? payload.m3u8.trim() : "",
    videoKey: typeof payload?.k === "string" ? payload.k.trim() : "",
    videoSalt: typeof payload?.s === "string" ? payload.s.trim() : "",
  };
}

async function requireGoodshortAccess(request: NextRequest) {
  if (isMiniappRequest(request)) return null;

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: buildCorsHeaders("application/json") },
    );
  }

  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  const legacyUrl = request.nextUrl.searchParams.get("url")?.trim() ?? "";

  if (legacyUrl) {
    return NextResponse.json(
      { ok: false, error: "Direct URL playback is disabled." },
      { status: 403, headers: buildCorsHeaders("application/json") },
    );
  }

  const rateLimitError = checkStreamRateLimit({
    request,
    provider: "goodshort",
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
  rawPayloadUrl: string,
  parentPayload: VerifiedStreamToken,
) {
  const wrapped = unwrapGoodshortUrl(rawPayloadUrl);
  const decodedUrl = wrapped.url;
  const videoKey = wrapped.videoKey;
  const videoSalt = wrapped.videoSalt;

  if (!decodedUrl) {
    return jsonError("Missing GoodShort stream url.", 400);
  }

  if (decodedUrl.startsWith("data:")) {
    const parsedDataUrl = parseDataUrl(decodedUrl);

    if (!parsedDataUrl) {
      return jsonError("Invalid GoodShort data url.", 400);
    }

    return new NextResponse(parsedDataUrl.body, {
      status: 200,
      headers: {
        "Content-Type": parsedDataUrl.contentType,
        "Content-Length": String(parsedDataUrl.body.byteLength),
        ...buildCorsHeaders(parsedDataUrl.contentType),
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  if (decodedUrl.startsWith("local://offline-key")) {
    const keyDataUrl = maybeBuildVideoKeyDataUrl(videoKey, videoSalt);

    if (!keyDataUrl) {
      return jsonError("Missing GoodShort video key.", 400);
    }

    const parsedDataUrl = parseDataUrl(keyDataUrl);

    if (!parsedDataUrl) {
      return jsonError("Invalid GoodShort video key.", 400);
    }

    return new NextResponse(parsedDataUrl.body, {
      status: 200,
      headers: {
        "Content-Type": parsedDataUrl.contentType,
        "Content-Length": String(parsedDataUrl.body.byteLength),
        ...buildCorsHeaders(parsedDataUrl.contentType),
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  if (!isAbsoluteUrl(decodedUrl)) {
    return jsonError("Invalid GoodShort stream url.", 400);
  }

  const targetUrl = normalizeIncomingTargetUrl(decodedUrl);

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return jsonError("Malformed GoodShort stream url.", 400);
  }

  if (!ALLOWED_PROTOCOLS.has(parsedUrl.protocol)) {
    return jsonError("Unsupported GoodShort protocol.", 400);
  }

  if (!isAllowedGoodshortHost(parsedUrl.hostname)) {
    return jsonError("Forbidden GoodShort host.", 403);
  }

  const upstream = await fetch(targetUrl, {
    method: request.method === "HEAD" ? "HEAD" : "GET",
    cache: "no-store",
    redirect: "follow",
    headers: buildUpstreamHeaders(request, parsedUrl),
  });

  const contentType = upstream.headers.get("content-type") || "";
  const isPlaylist = shouldTreatAsPlaylist(targetUrl, contentType);

  if (!upstream.ok) {
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: copyUpstreamHeaders(upstream, contentType),
    });
  }

  if (request.method === "HEAD") {
    return new NextResponse(null, {
      status: upstream.status,
      headers: copyUpstreamHeaders(
        upstream,
        isPlaylist ? "application/vnd.apple.mpegurl; charset=utf-8" : contentType,
      ),
    });
  }

  if (!isPlaylist) {
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: copyUpstreamHeaders(upstream, contentType),
    });
  }

  const playlistText = await upstream.text();
  const rewrittenPlaylist = rewriteGoodshortPlaylist(
    playlistText,
    targetUrl,
    parentPayload,
    videoKey,
    videoSalt,
  );

  return new NextResponse(rewrittenPlaylist, {
    status: 200,
    headers: copyUpstreamHeaders(
      upstream,
      "application/vnd.apple.mpegurl; charset=utf-8",
    ),
  });
}

async function handleStream(request: NextRequest) {
  const isMiniapp = isMiniappRequest(request);
  const user = isMiniapp ? null : await getCurrentUser();

  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  const legacyUrl = request.nextUrl.searchParams.get("url")?.trim() ?? "";

  if (legacyUrl) {
    return NextResponse.json(
      { ok: false, error: "Direct URL playback is disabled." },
      { status: 403, headers: buildCorsHeaders("application/json") },
    );
  }

  if (token) {
    const payload = verifyStreamToken(token);

    if (
      !payload ||
      payload.provider !== "goodshort" ||
      (!isMiniapp && user && payload.userId !== user.id)
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired stream token" },
        { status: 403, headers: buildCorsHeaders("application/json") },
      );
    }

    return proxyMedia(request, payload.url, payload);
  }

  const bookId = request.nextUrl.searchParams.get("bookId")?.trim() ?? "";
  const chapterId = request.nextUrl.searchParams.get("chapterId")?.trim() ?? "";
  const quality = request.nextUrl.searchParams.get("q")?.trim() || "720p";
  const episodeNumber =
    Number(
      request.nextUrl.searchParams.get("episodeNumber") ||
        request.nextUrl.searchParams.get("episode") ||
        request.nextUrl.searchParams.get("ep") ||
        "1",
    ) || 1;

  if (!bookId || !chapterId) {
    return jsonError("Missing GoodShort bookId/chapterId.", 400);
  }

  const resolved = await resolveGoodshortPlay(bookId, chapterId, quality);

  if (!resolved.url) {
    return jsonError("Failed to resolve GoodShort stream.", 404);
  }

  const wrappedUrl = wrapGoodshortUrl(
    resolved.url,
    resolved.videoKey,
    resolved.videoSalt,
  );

  const initialPayload: VerifiedStreamToken = {
    provider: "goodshort",
    userId: isMiniapp ? "miniapp" : user!.id,
    episodeKey: `${bookId}:${chapterId}:${episodeNumber}`,
    url: wrappedUrl,
    exp: Math.floor(Date.now() / 1000) + 180,
  };

  if (isMiniapp) {
    return proxyMedia(request, wrappedUrl, initialPayload);
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
      Location: `/api/goodshort/stream?token=${encodeURIComponent(initialToken)}`,
      ...buildCorsHeaders(),
    },
  });
}

export async function GET(request: NextRequest) {
  const accessError = await requireGoodshortAccess(request);
  if (accessError) return accessError;

  return handleStream(request);
}

export async function HEAD(request: NextRequest) {
  const accessError = await requireGoodshortAccess(request);
  if (accessError) return accessError;

  return handleStream(request);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(),
  });
}
