import { NextRequest, NextResponse } from "next/server";
import {
  createStreamToken,
  verifyStreamToken,
  isStreamTokenExpired,
} from "@/lib/stream/token";
import { fetchJson } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function copyHeaders(upstream: Headers) {
  const headers = new Headers();

  upstream.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) return;
    if (lower === "content-security-policy") return;
    if (lower === "content-encoding") return;
    if (lower === "content-disposition") return;
    if (lower === "content-length") return;
    headers.set(key, value);
  });

  headers.set("cache-control", "no-store");
  headers.set("access-control-allow-origin", "*");
  headers.set(
    "access-control-expose-headers",
    "Content-Length, Content-Range, Accept-Ranges, Content-Type",
  );

  return headers;
}

async function proxy(req: NextRequest) {
  const st = req.nextUrl.searchParams.get("s") || "";
  const payload = verifyStreamToken(st);

  if (!payload) {
    console.error("[DRAMAWAVE TOKEN INVALID]", {
      stLength: st.length,
      tokenParts: st.split(".").length,
      sample: st.slice(0, 120),
    });

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isStreamTokenExpired(payload)) {
    const refreshed = createStreamToken({
      provider: payload.provider,
      userId: payload.userId,
      episodeKey: payload.episodeKey,
      url: payload.url,
    });

    return NextResponse.redirect(
      `/api/dramawave/stream?s=${encodeURIComponent(refreshed)}`,
      302,
    );
  }

  const range = req.headers.get("range") || undefined;

  const upstream = await fetch(payload.url, {
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "*/*",
      ...(range ? { Range: range } : {}),
    },
    cache: "no-store",
    redirect: "follow",
  });

  const contentType =
    upstream.headers.get("content-type")?.toLowerCase() || "";

  if (
    contentType.includes("mpegurl") ||
    payload.url.toLowerCase().includes(".m3u8")
  ) {
    const text = await upstream.text();
    const base = new URL(payload.url);

    const host =
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      "tg.dramalotus.site";

    const proto =
      req.headers.get("x-forwarded-proto") || "https";

    const rewritten = text
      .split("\n")
      .map((line) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return line;
        }

        if (trimmed.startsWith("#")) {
          return line.replace(/URI="([^"]+)"/g, (_match, uri) => {
            try {
              const resolved = new URL(uri, base).toString();

              if (
                resolved.includes("/api/dramawave/stream?s=") &&
                resolved.includes(host)
              ) {
                return `URI="${resolved}"`;
              }

              const token = createStreamToken({
                provider: "dramawave",
                userId: "system",
                episodeKey: "segment",
                url: resolved,
              });

              return `URI="${proto}://${host}/api/dramawave/stream?s=${encodeURIComponent(token)}"`;
            } catch {
              return _match;
            }
          });
        }

        let resolved: string;

        try {
          resolved = new URL(trimmed, base).toString();
        } catch {
          return line;
        }

        if (
          resolved.includes("/api/dramawave/stream?s=") &&
          resolved.includes(host)
        ) {
          return resolved;
        }

        const token = createStreamToken({
          provider: "dramawave",
          userId: "system",
          episodeKey: "segment",
          url: resolved,
        });

        return `${proto}://${host}/api/dramawave/stream?s=${encodeURIComponent(token)}`;
      })
      .join("\n");

    const headers = copyHeaders(upstream.headers);
    headers.set("content-type", "application/vnd.apple.mpegurl");

    return new NextResponse(rewritten, {
      status: upstream.status,
      headers,
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: copyHeaders(upstream.headers),
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,HEAD,OPTIONS",
      "access-control-allow-headers": "Content-Type, Range",
    },
  });
}

export async function GET(req: NextRequest) {
  const st = req.nextUrl.searchParams.get("s");

  if (st) {
    return proxy(req);
  }

  try {
    const dramaId = req.nextUrl.searchParams.get("dramaId")?.trim() || "";

    if (!dramaId) {
      return NextResponse.json({ error: "Missing dramaId" }, { status: 400 });
    }

    const episodeNo =
      req.nextUrl.searchParams.get("episode")?.trim() || "1";

    const payload = await fetchJson(
      `/api/v1/dramas/${encodeURIComponent(dramaId)}/play/${encodeURIComponent(episodeNo)}?lang=id-ID`
    );

    const episode = payload?.data || null;

    if (!episode) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    const streamUrl =
      episode.external_audio_h265_m3u8 ||
      episode.external_audio_h264_m3u8 ||
      episode.m3u8_url ||
      episode.video_url ||
      "";

    if (!streamUrl) {
      return NextResponse.json({ error: "No stream found" }, { status: 404 });
    }

    const token = createStreamToken({
      provider: "dramawave",
      userId: "system",
      episodeKey: dramaId,
      url: streamUrl,
    });

    const host =
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      "tg.dramalotus.site";

    const proto =
      req.headers.get("x-forwarded-proto") || "https";

    return NextResponse.redirect(
      `${proto}://${host}/api/dramawave/stream?s=${encodeURIComponent(token)}`,
      302,
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Stream failed",
      },
      { status: 500 },
    );
  }
}
