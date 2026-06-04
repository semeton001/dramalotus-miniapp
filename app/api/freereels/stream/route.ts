import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { createStreamToken, verifyStreamToken } from "@/lib/stream/token";
import { checkStreamRateLimit } from "@/lib/rate-limit/stream";
import { isMiniappRequest } from "@/lib/auth/isMiniappRequest";
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

function hasSameOrigin(left: string, right: string): boolean {
  try {
    return new URL(left).origin === new URL(right).origin;
  } catch {
    return false;
  }
}

function buildSignedProxyUrl(_url: string, token: string): string {
  return `/api/freereels/stream?token=${encodeURIComponent(token)}`;
}

type VerifiedStreamToken = NonNullable<ReturnType<typeof verifyStreamToken>>;

function buildChildSignedProxyUrl(url: string, parentPayload: VerifiedStreamToken): string {
  const childToken = createStreamToken({
    provider: parentPayload.provider,
    userId: parentPayload.userId,
    episodeKey: parentPayload.episodeKey,
    url,
  });

  return buildSignedProxyUrl(url, childToken);
}

function rewriteUriAttribute(line: string, manifestUrl: string, tokenPayload: VerifiedStreamToken): string {
  return line.replace(/URI="([^"]+)"/g, (_match, uri) => {
    const absolute = toAbsoluteUrl(manifestUrl, uri);
    return `URI="${buildChildSignedProxyUrl(absolute, tokenPayload)}"`;
  });
}

function rewriteM3u8Manifest(
  manifestText: string,
  manifestUrl: string,
  tokenPayload: VerifiedStreamToken,
): string {
  const lines = manifestText.split(/\r?\n/);

  return lines
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) return line;

      if (trimmed.startsWith("#EXT-X-KEY:")) {
        return rewriteUriAttribute(line, manifestUrl, tokenPayload);
      }

      if (trimmed.startsWith("#EXT-X-MAP:")) {
        return rewriteUriAttribute(line, manifestUrl, tokenPayload);
      }

      if (trimmed.startsWith("#EXT-X-MEDIA:")) {
        return rewriteUriAttribute(line, manifestUrl, tokenPayload);
      }

      if (trimmed.startsWith("#")) {
        return line;
      }

      const absolute = isAbsoluteUrl(trimmed)
        ? trimmed
        : toAbsoluteUrl(manifestUrl, trimmed);

      return buildChildSignedProxyUrl(absolute, tokenPayload);
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
  const isMiniapp = isMiniappRequest(request);
  const user = isMiniapp ? null : await getCurrentUser();

  try {
    const passthroughUrl = request.nextUrl.searchParams.get("url") || "";
    const token = request.nextUrl.searchParams.get("token") || "";
    const tokenPayload = token ? verifyStreamToken(token) : null;
    const tokenTargetUrl = tokenPayload?.url || "";
    const targetUrl = passthroughUrl.trim() || tokenTargetUrl;

    if (targetUrl.trim()) {
      if (
        !tokenPayload ||
        tokenPayload.provider !== "freereels" ||
        (!isMiniapp && user && tokenPayload.userId !== user.id) ||
        !hasSameOrigin(tokenPayload.url, targetUrl)
      ) {
        return NextResponse.json(
          { ok: false, error: "Invalid or expired stream token" },
          { status: 403 },
        );
      }

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
        const rewrittenManifest = rewriteM3u8Manifest(manifestText, targetUrl, tokenPayload);

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
    const code = getFreeReelsCode();

    if (!dramaId.trim() || !episodeId.trim()) {
      return NextResponse.json(
        { error: "Parameter dramaId dan episodeId wajib diisi." },
        { status: 400 },
      );
    }

    const episodeNumber = Number(episodeId.trim());

    if (!Number.isInteger(episodeNumber) || episodeNumber < 1) {
      return NextResponse.json(
        { error: "episodeId tidak valid." },
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

    const streamToken = createStreamToken({
      provider: "freereels",
      userId: isMiniapp ? "miniapp" : (user?.id || "public"),
      episodeKey: `${dramaId.trim()}:${episodeId.trim()}`,
      url: playableUrl,
    });

    const subtitleUrl = extractSubtitleUrlFromPlayPayload(payload);

    console.warn("FreeReels stream resolved:", {
      dramaId: dramaId.trim(),
      episodeId: episodeId.trim(),
      hasSubtitle: Boolean(subtitleUrl),
    });

    return NextResponse.json({
      url: buildSignedProxyUrl(playableUrl, streamToken),
      subtitleUrl,
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
