import { NextRequest } from "next/server";
import { createProxyHeaders, jsonError, rewriteM3u8Playlist } from "../_shared";

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
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

function decodeUrl(rawUrl: string): string {
  try {
    return decodeURIComponent(rawUrl);
  } catch {
    return rawUrl;
  }
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
    const encoder = new TextEncoder();

    const encoded = encoder.encode(decoded);

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

function maybeBuildVideoKeyDataUrl(videoKey: string): string {
  const trimmed = videoKey.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("data:")) return trimmed;

  return `data:text/plain;base64,${trimmed}`;
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,HEAD,OPTIONS",
      "access-control-allow-headers": "*",
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const rawUrl = request.nextUrl.searchParams.get("url")?.trim() ?? "";
    const videoKey = request.nextUrl.searchParams.get("videoKey")?.trim() ?? "";

    if (!rawUrl) {
      return jsonError("Missing GoodShort stream url.", 400);
    }

    const decodedUrl = decodeUrl(rawUrl);

    if (decodedUrl.startsWith("data:")) {
      const parsedDataUrl = parseDataUrl(decodedUrl);
      if (!parsedDataUrl) {
        return jsonError("Invalid GoodShort data url.", 400);
      }

      return new Response(parsedDataUrl.body, {
        status: 200,
        headers: {
          "content-type": parsedDataUrl.contentType,
          "content-length": String(parsedDataUrl.body.byteLength),
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,HEAD,OPTIONS",
          "access-control-allow-headers": "*",
          "cache-control": "public, max-age=300",
        },
      });
    }

    if (decodedUrl.startsWith("local://offline-key")) {
      const keyDataUrl = maybeBuildVideoKeyDataUrl(videoKey);
      if (!keyDataUrl) {
        return jsonError("Missing GoodShort video key.", 400);
      }

      const parsedDataUrl = parseDataUrl(keyDataUrl);
      if (!parsedDataUrl) {
        return jsonError("Invalid GoodShort video key.", 400);
      }

      return new Response(parsedDataUrl.body, {
        status: 200,
        headers: {
          "content-type": parsedDataUrl.contentType,
          "content-length": String(parsedDataUrl.body.byteLength),
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,HEAD,OPTIONS",
          "access-control-allow-headers": "*",
          "cache-control": "public, max-age=300",
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

    if (!isAllowedGoodshortHost(parsedUrl.hostname)) {
      return jsonError("Forbidden GoodShort host.", 403);
    }

    const requestHeaders = new Headers({
      accept: "*/*",
      origin: "https://goodshort.dramabos.my.id",
      referer: "https://goodshort.dramabos.my.id/",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    });

    const isLikelyPlaylistRequest = targetUrl.toLowerCase().includes(".m3u8");
    const range = request.headers.get("range");

    if (range && !isLikelyPlaylistRequest) {
      requestHeaders.set("range", range);
    }

    const upstream = await fetch(targetUrl, {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
      headers: requestHeaders,
    });

    if (!upstream.ok) {
      return new Response(upstream.body, {
        status: upstream.status,
        headers: createProxyHeaders(upstream, false),
      });
    }

    const contentType = upstream.headers.get("content-type") || "";
    const isPlaylist = shouldTreatAsPlaylist(targetUrl, contentType);

    if (!isPlaylist) {
      return new Response(upstream.body, {
        status: upstream.status,
        headers: createProxyHeaders(upstream, false),
      });
    }

    let playlistText = await upstream.text();

    if (videoKey) {
      playlistText = playlistText.replace(
        /URI="local:\/\/offline-key[^"]*"/gi,
        `URI="/api/goodshort/stream?url=${encodeURIComponent("local://offline-key")}&videoKey=${encodeURIComponent(videoKey)}"`,
      );

      const keyDataUrl = maybeBuildVideoKeyDataUrl(videoKey);
      if (keyDataUrl) {
        playlistText = playlistText.replace(
          /URI="data:text\/plain;base64,[^"]*"/gi,
          `URI="/api/goodshort/stream?url=${encodeURIComponent(keyDataUrl)}&videoKey=${encodeURIComponent(videoKey)}"`,
        );
      }
    }

    const rewrittenPlaylist = rewriteM3u8Playlist(playlistText, targetUrl);

    const headers = new Headers();
    headers.set("content-type", "application/vnd.apple.mpegurl; charset=utf-8");
    headers.set("cache-control", "no-store");
    headers.set("access-control-allow-origin", "*");
    headers.set("access-control-allow-methods", "GET,HEAD,OPTIONS");
    headers.set("access-control-allow-headers", "*");

    return new Response(rewrittenPlaylist, {
      status: 200,
      headers,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Gagal memuat stream GoodShort.",
      500,
    );
  }
}
