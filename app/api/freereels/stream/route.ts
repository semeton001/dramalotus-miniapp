import { NextRequest, NextResponse } from "next/server";
import {
  getFreeReelsCode,
  resolvePlayData,
  resolvePlayableUrl,
} from "../_shared";

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function toAbsoluteUrl(baseUrl: string, value: string): string {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function rewriteUriAttribute(line: string, manifestUrl: string): string {
  return line.replace(/URI="([^"]+)"/g, (_match, uri) => {
    const absolute = toAbsoluteUrl(manifestUrl, uri);
    return `URI="/api/freereels/stream?url=${encodeURIComponent(absolute)}"`;
  });
}

function rewriteM3u8Manifest(
  manifestText: string,
  manifestUrl: string,
): string {
  const lines = manifestText.split(/\r?\n/);

  return lines
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) return line;

      if (trimmed.startsWith("#EXT-X-KEY:")) {
        return rewriteUriAttribute(line, manifestUrl);
      }

      if (trimmed.startsWith("#EXT-X-MAP:")) {
        return rewriteUriAttribute(line, manifestUrl);
      }

      if (trimmed.startsWith("#EXT-X-MEDIA:")) {
        return rewriteUriAttribute(line, manifestUrl);
      }

      if (trimmed.startsWith("#")) {
        return line;
      }

      const absolute = isAbsoluteUrl(trimmed)
        ? trimmed
        : toAbsoluteUrl(manifestUrl, trimmed);

      return `/api/freereels/stream?url=${encodeURIComponent(absolute)}`;
    })
    .join("\n");
}

function buildPassthroughHeaders(request: NextRequest) {
  const headers = new Headers();
  headers.set("Accept", "*/*");

  const range = request.headers.get("range");
  if (range) {
    headers.set("Range", range);
  }

  const userAgent = request.headers.get("user-agent");
  if (userAgent) {
    headers.set("User-Agent", userAgent);
  }

  return headers;
}

function pickString(
  record: Record<string, unknown>,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function extractSubtitleUrlFromPlayPayload(payload: unknown): string {
  const candidates: unknown[] = [];

  if (payload && typeof payload === "object") {
    const root = payload as Record<string, unknown>;
    candidates.push(
      root.subtitle_list,
      root.subtitleList,
      root.subtitles,
      root.subtitle,
    );

    const data = root.data;
    if (data && typeof data === "object") {
      const nested = data as Record<string, unknown>;
      candidates.push(
        nested.subtitle_list,
        nested.subtitleList,
        nested.subtitles,
        nested.subtitle,
      );
    }
  }

  const pickSubtitleEntry = (
    value: unknown,
  ): Record<string, unknown> | null => {
    if (!Array.isArray(value)) return null;

    const entries = value.filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object",
    );

    const preferred =
      entries.find((entry) => {
        const language = pickString(
          entry,
          "language",
          "lang",
          "locale",
        ).toLowerCase();

        const displayName = pickString(
          entry,
          "display_name",
          "displayName",
          "name",
          "label",
        ).toLowerCase();

        return (
          language === "id-id" ||
          language === "id" ||
          language.includes("indonesia") ||
          displayName === "indonesia" ||
          displayName.includes("indonesia")
        );
      }) || entries[0];

    return preferred || null;
  };

  for (const candidate of candidates) {
    const entry = pickSubtitleEntry(candidate);
    if (!entry) continue;

    const subtitleSource = pickString(
      entry,
      "vtt",
      "subtitle",
      "url",
      "subtitle_url",
      "subtitleUrl",
      "src",
    );

    if (subtitleSource) {
      return `/api/freereels/subtitle?url=${encodeURIComponent(
        subtitleSource,
      )}`;
    }
  }

  return "";
}

export async function GET(request: NextRequest) {
  try {
    const passthroughUrl = request.nextUrl.searchParams.get("url") || "";

    if (passthroughUrl.trim()) {
      const targetUrl = passthroughUrl.trim();
      const upstream = await fetch(targetUrl, {
        cache: "no-store",
        headers: buildPassthroughHeaders(request),
      });

      if (!upstream.ok) {
        return NextResponse.json(
          {
            error: `Gagal mengambil stream upstream. status=${upstream.status}`,
          },
          { status: upstream.status },
        );
      }

      const contentType =
        upstream.headers.get("content-type") ||
        (targetUrl.includes(".m3u8")
          ? "application/vnd.apple.mpegurl"
          : "video/mp4");

      const isManifest =
        targetUrl.includes(".m3u8") ||
        contentType.includes("application/vnd.apple.mpegurl") ||
        contentType.includes("application/x-mpegURL");

      if (isManifest) {
        const manifestText = await upstream.text();
        const rewrittenManifest = rewriteM3u8Manifest(manifestText, targetUrl);

        return new NextResponse(rewrittenManifest, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      const responseHeaders = new Headers();
      responseHeaders.set("Content-Type", contentType);
      responseHeaders.set("Cache-Control", "no-store");
      responseHeaders.set("Access-Control-Allow-Origin", "*");

      const contentLength = upstream.headers.get("content-length");
      const contentRange = upstream.headers.get("content-range");
      const acceptRanges = upstream.headers.get("accept-ranges");

      if (contentLength) responseHeaders.set("Content-Length", contentLength);
      if (contentRange) responseHeaders.set("Content-Range", contentRange);
      if (acceptRanges) responseHeaders.set("Accept-Ranges", acceptRanges);

      return new NextResponse(upstream.body, {
        status: upstream.status,
        headers: responseHeaders,
      });
    }

    const dramaId = request.nextUrl.searchParams.get("dramaId") || "";
    const episodeId =
      request.nextUrl.searchParams.get("episodeId") ||
      request.nextUrl.searchParams.get("ep") ||
      "";
    const code = request.nextUrl.searchParams.get("code") || getFreeReelsCode();

    if (!dramaId.trim() || !episodeId.trim()) {
      return NextResponse.json(
        { error: "Parameter dramaId dan episodeId wajib diisi." },
        { status: 400 },
      );
    }

    const payload = await resolvePlayData(
      dramaId.trim(),
      episodeId.trim(),
      code,
    );
    const playableUrl = resolvePlayableUrl(payload);

    if (!playableUrl) {
      return NextResponse.json(
        { error: "URL stream FreeReels tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      url: `/api/freereels/stream?url=${encodeURIComponent(playableUrl)}`,
      subtitleUrl: extractSubtitleUrlFromPlayPayload(payload),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal resolve stream FreeReels.",
      },
      { status: 500 },
    );
  }
}
