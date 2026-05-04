import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { FREE_EPISODE_LIMIT } from "@/lib/episodes/access";
import { isMiniappRequest } from "@/lib/auth/isMiniappRequest";
import { checkStreamRateLimit } from "@/lib/rate-limit/stream";
import { createStreamToken, verifyStreamToken } from "@/lib/stream/token";
import { IDRAMA_DEFAULT_CODE, fetchIdramaJson } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type JsonRecord = Record<string, unknown>;
type VerifiedStreamToken = NonNullable<ReturnType<typeof verifyStreamToken>>;

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

const IDRAMA_UNLOCK_BASE_URL = "https://captain.sapimu.au/idrama/api/v1";
const IDRAMA_UNLOCK_TOKEN = process.env.IDRAMA_UNLOCK_TOKEN?.trim() || "";

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

function getNestedPlayInfoList(payload: unknown): unknown[] {
  if (!payload || typeof payload !== "object") return [];

  const raw = payload as JsonRecord;
  const targetEpInfo =
    raw["target_ep_info"] && typeof raw["target_ep_info"] === "object"
      ? (raw["target_ep_info"] as JsonRecord)
      : null;

  if (targetEpInfo) {
    const targetList = targetEpInfo["play_info_list"];
    if (Array.isArray(targetList)) return targetList;
  }

  const candidates: unknown[] = [
    raw["play_info_list"],
    raw["data"],
    raw["result"],
    raw["item"],
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;

    if (candidate && typeof candidate === "object") {
      const nested = candidate as JsonRecord;

      if (Array.isArray(nested["play_info_list"])) {
        return nested["play_info_list"] as unknown[];
      }

      const nestedData = nested["data"];
      if (nestedData && typeof nestedData === "object") {
        const nestedDataRecord = nestedData as JsonRecord;
        if (Array.isArray(nestedDataRecord["play_info_list"])) {
          return nestedDataRecord["play_info_list"] as unknown[];
        }
      }
    }
  }

  return [];
}

function extractPlayableUrl(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";

  const raw = payload as JsonRecord;
  const targetEpInfo =
    raw["target_ep_info"] && typeof raw["target_ep_info"] === "object"
      ? (raw["target_ep_info"] as JsonRecord)
      : null;

  if (targetEpInfo) {
    const targetPlayInfoList = Array.isArray(targetEpInfo["play_info_list"])
      ? (targetEpInfo["play_info_list"] as unknown[])
      : [];

    const firstPlayableFromTarget = targetPlayInfoList.find((item) => {
      if (!item || typeof item !== "object") return false;
      const playUrl = (item as JsonRecord)["play_url"];
      return typeof playUrl === "string" && playUrl.trim().length > 0;
    });

    if (firstPlayableFromTarget && typeof firstPlayableFromTarget === "object") {
      const playUrl = String(
        (firstPlayableFromTarget as JsonRecord)["play_url"] || "",
      ).trim();

      if (playUrl) return playUrl;
    }

    const fallbackTargetPlayUrl = targetEpInfo["play_url"];
    if (
      typeof fallbackTargetPlayUrl === "string" &&
      fallbackTargetPlayUrl.trim().length > 0
    ) {
      return fallbackTargetPlayUrl.trim();
    }
  }

  const playInfoList = getNestedPlayInfoList(payload);

  const firstPlayable = playInfoList.find((item) => {
    if (!item || typeof item !== "object") return false;
    const rawItem = item as JsonRecord;
    return (
      typeof rawItem["play_url"] === "string" &&
      rawItem["play_url"].trim().length > 0
    );
  });

  if (!firstPlayable || typeof firstPlayable !== "object") return "";

  return String((firstPlayable as JsonRecord)["play_url"] || "").trim();
}


function extractPlayableUrlFromCaptainUnlock(payload: unknown, ep: string): string {
  if (!payload || typeof payload !== "object") return "";

  const raw = payload as JsonRecord;
  const episodes = Array.isArray(raw["episodes"]) ? raw["episodes"] : [];
  const targetEp = Number(ep);

  const matched =
    episodes.find((item) => {
      if (!item || typeof item !== "object") return false;
      const record = item as JsonRecord;
      return Number(record["episode"]) === targetEp;
    }) || episodes[0];

  if (!matched || typeof matched !== "object") return "";

  const data = (matched as JsonRecord)["data"];
  if (!data || typeof data !== "object") return "";

  return extractPlayableUrl(data);
}

async function resolveIdramaPlayUrlFromCaptain(
  dramaId: string,
  ep: string,
): Promise<string> {
  if (!IDRAMA_UNLOCK_TOKEN) return "";

  const url = `${IDRAMA_UNLOCK_BASE_URL}/unlock/${encodeURIComponent(
    dramaId,
  )}/${encodeURIComponent(ep)}/all`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${IDRAMA_UNLOCK_TOKEN}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) return "";

  const payload = await response.json();
  return unwrapIdramaProxyUrl(extractPlayableUrlFromCaptainUnlock(payload, ep));
}

function unwrapIdramaProxyUrl(value: string): string {
  try {
    const url = new URL(value);
    const wrapped = url.searchParams.get("url");
    if (wrapped && wrapped.trim()) return decodeURIComponent(wrapped.trim());
    return value;
  } catch {
    return value;
  }
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

  return `/api/idrama/stream?token=${encodeURIComponent(token)}`;
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

  if (contentType) headers.set("Content-Type", contentType);

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
  headers.set("Referer", "https://idrama.dramabos.my.id/");
  headers.set("Origin", "https://idrama.dramabos.my.id");
  headers.set(
    "User-Agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  );

  if (range && !upstreamUrl.pathname.toLowerCase().endsWith(".m3u8")) {
    headers.set("Range", range);
  }

  return headers;
}

async function resolveIdramaPlayUrl(
  dramaId: string,
  ep: string,
  code: string,
): Promise<string> {
  if (!dramaId.trim() || !ep.trim()) return "";

  try {
    const payload = await fetchIdramaJson(`/unlock/${dramaId}/${ep}`, { code });
    const primaryUrl = unwrapIdramaProxyUrl(extractPlayableUrl(payload));

    if (primaryUrl) return primaryUrl;
  } catch (error) {
    console.warn("iDrama primary resolver failed, trying captain fallback:", error);
  }

  try {
    return await resolveIdramaPlayUrlFromCaptain(dramaId, ep);
  } catch (error) {
    console.warn("iDrama captain fallback resolver failed:", error);
    return "";
  }
}

async function requireIdramaAccess(request: NextRequest) {
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
    provider: "idrama",
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
      payload.provider !== "idrama" ||
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
  const ep =
    request.nextUrl.searchParams.get("ep")?.trim() ||
    request.nextUrl.searchParams.get("episode")?.trim() ||
    request.nextUrl.searchParams.get("episodeNumber")?.trim() ||
    "";
  const code = request.nextUrl.searchParams.get("code")?.trim() || IDRAMA_DEFAULT_CODE;

  if (!dramaId || !ep) {
    return NextResponse.json(
      { error: "Missing iDrama dramaId/ep." },
      { status: 400, headers: buildCorsHeaders("application/json") },
    );
  }

  const resolvedUrl = await resolveIdramaPlayUrl(dramaId, ep, code);

  if (!resolvedUrl) {
    return NextResponse.json(
      { error: "Failed to resolve iDrama stream" },
      { status: 404, headers: buildCorsHeaders("application/json") },
    );
  }

  const initialPayload: VerifiedStreamToken = {
    provider: "idrama",
    userId: isMiniapp ? "miniapp" : user!.id,
    episodeKey: `${dramaId}:${ep}`,
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
      Location: `/api/idrama/stream?token=${encodeURIComponent(initialToken)}`,
      ...buildCorsHeaders(),
    },
  });
}

export async function GET(request: NextRequest) {
  const accessError = await requireIdramaAccess(request);
  if (accessError) return accessError;

  return handleStream(request);
}

export async function HEAD(request: NextRequest) {
  const accessError = await requireIdramaAccess(request);
  if (accessError) return accessError;

  return handleStream(request);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(),
  });
}
