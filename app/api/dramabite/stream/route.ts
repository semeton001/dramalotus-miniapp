import { NextRequest, NextResponse } from "next/server";
import { requireApiVip } from "@/lib/auth/requireApiVip";
import {
  buildProxyBaseUrl,
  fetchDramabiteJson,
  normalizeProxyPlaylistUrls,
  rewriteM3u8Playlist,
} from "../_shared";

type JsonRecord = Record<string, unknown>;

function forwardHeaders(contentType: string) {
  const headers = new Headers();
  headers.set("content-type", contentType || "application/octet-stream");
  headers.set("cache-control", "no-store");
  headers.set("access-control-allow-origin", "*");
  return headers;
}

async function fetchMediaResponse(url: string, range?: string | null) {
  return fetch(url, {
    method: "GET",
    headers: {
      Accept: "*/*",
      ...(range ? { Range: range } : {}),
    },
    cache: "no-store",
  });
}

export async function GET(request: NextRequest) {
  const vipError = await requireApiVip();
  if (vipError) return vipError;

  try {
    let rawUrl =
      request.nextUrl.searchParams.get("u")?.trim() ||
      request.nextUrl.searchParams.get("url")?.trim() ||
      "";
    const dramaId = request.nextUrl.searchParams.get("dramaId")?.trim() || "";
    const episode =
      request.nextUrl.searchParams.get("episode")?.trim() ||
      request.nextUrl.searchParams.get("ep")?.trim() ||
      "";

    if (!rawUrl) {
      if (!dramaId || !episode) {
        return NextResponse.json(
          { error: "Missing DramaBite stream url or dramaId/episode." },
          { status: 400 },
        );
      }

      const payload = (await fetchDramabiteJson(
        `/drama/${encodeURIComponent(dramaId)}/episode/${encodeURIComponent(
          episode,
        )}`,
        { quality: "default" },
      )) as JsonRecord;

      rawUrl = typeof payload?.video === "string" ? payload.video.trim() : "";
    }

    if (!rawUrl) {
      return NextResponse.json(
        { error: "No DramaBite playable stream found." },
        { status: 404 },
      );
    }

    const response = await fetchMediaResponse(
      rawUrl,
      request.headers.get("range"),
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Failed to load DramaBite stream: ${response.status}`,
          rawUrl,
        },
        { status: response.status },
      );
    }

    const contentType = response.headers.get("content-type") || "";
    const activeTargetUrl = response.url || rawUrl;

    if (
      activeTargetUrl.includes(".m3u8") ||
      contentType.includes("mpegurl") ||
      contentType.includes("application/x-mpegURL")
    ) {
      const text = await response.text();
      const rewritten = rewriteM3u8Playlist(
        text,
        buildProxyBaseUrl(request),
        activeTargetUrl,
      );
      const normalized = normalizeProxyPlaylistUrls(rewritten, request);
      const headers = forwardHeaders(contentType || "application/vnd.apple.mpegurl");
      headers.delete("content-length");
      return new NextResponse(normalized, { status: 200, headers });
    }

    const headers = forwardHeaders(contentType);
    const contentLength = response.headers.get("content-length");
    const contentRange = response.headers.get("content-range");

    if (contentLength) headers.set("content-length", contentLength);
    if (contentRange) headers.set("content-range", contentRange);

    const body = await response.arrayBuffer();
    return new NextResponse(body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error("DramaBite stream route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load DramaBite stream.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
