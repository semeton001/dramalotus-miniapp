import { NextRequest } from "next/server";

function withCors(headers: Headers) {
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "*");
  return headers;
}

function isPlaylistTarget(target: string, contentType: string) {
  return (
    target.includes(".m3u8") ||
    contentType.includes("application/vnd.apple.mpegurl") ||
    contentType.includes("application/x-mpegURL") ||
    contentType.includes("audio/mpegurl")
  );
}

function absolutizeUrl(line: string, playlistUrl: string): string {
  if (line.startsWith("http://") || line.startsWith("https://")) {
    return line;
  }

  const base = new URL(playlistUrl);
  let absolute: URL;

  if (line.startsWith("/")) {
    absolute = new URL(`${base.protocol}//${base.host}${line}`);
  } else {
    absolute = new URL(line, playlistUrl);
  }

  if (!absolute.search && base.search) {
    absolute.search = base.search;
  }

  return absolute.toString();
}

function proxifyUrl(url: string, request: NextRequest): string {
  return `${request.nextUrl.origin}/api/shortmax/stream?u=${encodeURIComponent(
    url,
  )}`;
}

function rewritePlaylist(
  content: string,
  playlistUrl: string,
  request: NextRequest,
): string {
  return content
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) return line;

      if (trimmed.startsWith("#")) {
        if (trimmed.includes('URI="')) {
          return line.replace(/URI="([^"]+)"/g, (_match, uri) => {
            const absolute = absolutizeUrl(uri, playlistUrl);
            return `URI="${proxifyUrl(absolute, request)}"`;
          });
        }

        return line;
      }

      const absolute = absolutizeUrl(trimmed, playlistUrl);
      return proxifyUrl(absolute, request);
    })
    .join("\n");
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: withCors(new Headers()),
  });
}

export async function GET(request: NextRequest) {
  try {
    const target = request.nextUrl.searchParams.get("u")?.trim() || "";

    if (!target) {
      return new Response("Missing u", {
        status: 400,
        headers: withCors(new Headers()),
      });
    }

    const incomingRange = request.headers.get("range");
    const upstreamHeaders = new Headers();

    upstreamHeaders.set("accept", "*/*");
    upstreamHeaders.set(
      "user-agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    );

    try {
      const targetUrl = new URL(target);
      upstreamHeaders.set("origin", `${targetUrl.protocol}//${targetUrl.host}`);
      upstreamHeaders.set(
        "referer",
        `${targetUrl.protocol}//${targetUrl.host}/`,
      );
    } catch {
      // ignore invalid url parse
    }

    if (incomingRange) {
      upstreamHeaders.set("range", incomingRange);
    }

    const upstream = await fetch(target, {
      method: "GET",
      headers: upstreamHeaders,
      cache: "no-store",
      redirect: "follow",
    });

    const contentType = upstream.headers.get("content-type") || "";
    const headers = new Headers();

    if (contentType) headers.set("content-type", contentType);

    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("content-length", contentLength);

    const contentRange = upstream.headers.get("content-range");
    if (contentRange) headers.set("content-range", contentRange);

    const acceptRanges = upstream.headers.get("accept-ranges");
    if (acceptRanges) headers.set("accept-ranges", acceptRanges);

    headers.set("cache-control", "no-store");
    withCors(headers);

    if (!upstream.ok) {
      const body = await upstream.text().catch(() => "");
      return new Response(body || `Upstream error ${upstream.status}`, {
        status: upstream.status,
        headers,
      });
    }

    if (isPlaylistTarget(target, contentType)) {
      const text = await upstream.text();
      const rewritten = rewritePlaylist(text, target, request);

      headers.delete("content-length");
      headers.delete("content-range");
      headers.set("content-type", "application/vnd.apple.mpegurl");

      return new Response(rewritten, {
        status: upstream.status,
        headers,
      });
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Unknown Shortmax stream error",
      {
        status: 500,
        headers: withCors(new Headers()),
      },
    );
  }
}
