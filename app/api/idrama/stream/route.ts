export const runtime = "nodejs";

import crypto from "crypto";
import { NextRequest } from "next/server";
import { postIdramaJson } from "../_shared";

const STREAM_SECRET = process.env.IDRAMA_STREAM_SECRET?.trim() || "";

const ALLOWED_ORIGINS = new Set([
  "https://tg.dramalotus.site",
  "https://dramalotus.site",
  "https://www.dramalotus.site",
]);

function proxyHeaders() {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    Referer: "https://www.idrama.video/",
    Origin: "https://www.idrama.video",
    Accept: "*/*",
  };
}

function getCorsOrigin(request: NextRequest) {
  const origin = request.headers.get("origin")?.trim();

  if (!origin) return "https://tg.dramalotus.site";
  if (ALLOWED_ORIGINS.has(origin)) return origin;

  return null;
}

function signPayload(payload: string) {
  return crypto
    .createHmac("sha256", STREAM_SECRET)
    .update(payload)
    .digest("hex");
}

function encodeToken(url: string, kind: "segment" | "assetkey") {
  const exp = Math.floor(Date.now() / 1000) + 600;

  const payload = JSON.stringify({
    u: url,
    k: kind,
    exp,
  });

  const b64 = Buffer.from(payload).toString("base64url");
  const sig = signPayload(b64);

  return `${b64}.${sig}`;
}

function decodeToken(token: string) {
  const parts = token.split(".");

  if (parts.length !== 2) {
    throw new Error("Invalid token");
  }

  const [b64, sig] = parts;
  const expected = signPayload(b64);

  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(
      Buffer.from(sig),
      Buffer.from(expected),
    )
  ) {
    throw new Error("Invalid signature");
  }

  const payload = JSON.parse(
    Buffer.from(b64, "base64url").toString("utf8"),
  );

  if (!payload?.u || !payload?.k || !payload?.exp) {
    throw new Error("Invalid payload");
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }

  const parsed = new URL(payload.u);

  if (
    parsed.hostname !== "v-a.idrama.video" &&
    parsed.hostname !== "api.idrama.video"
  ) {
    throw new Error("Forbidden upstream");
  }

  return {
    url: parsed.toString(),
    kind: payload.k as "segment" | "assetkey",
  };
}

async function resolveEpisodeData(dramaId: string, episodeNumber: number) {
  const payload = await postIdramaJson(`/unlock/${dramaId}`);

  const epWrapper = payload?.episodes?.find(
    (x: any) => Number(x?.data?.episode_order) === episodeNumber,
  );

  const ep = epWrapper?.data;

  if (!ep) {
    throw new Error("Episode not found");
  }

  return ep;
}

function pickPlayUrl(ep: any) {
  return (
    ep.play_info_list?.find((x: any) => x.definition === "720p" && x.play_url)
      ?.play_url ||
    ep.play_info_list?.find((x: any) => x.definition === "540p" && x.play_url)
      ?.play_url ||
    ep.play_info_list?.find((x: any) => x.play_url)?.play_url ||
    ep.play_url ||
    ""
  );
}

async function fetchUpstream(url: string) {
  const res = await fetch(url, {
    headers: proxyHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Upstream failed ${res.status} ${res.statusText}`);
  }

  return res;
}

function rewritePlaylist(text: string, playlistUrl: string) {
  return text.replace(
    /URI="([^"]+)"|^(?!#)(.+)$/gm,
    (_, keyUrl, mediaUrl) => {
      const target = keyUrl || mediaUrl;
      if (!target) return _;

      const absolute = new URL(target, playlistUrl).toString();

      const kind = keyUrl ? "assetkey" : "segment";
      const token = encodeToken(absolute, kind);

      const proxied =
        `/api/idrama/stream?token=${encodeURIComponent(token)}`;

      return keyUrl ? `URI="${proxied}"` : proxied;
    },
  );
}

export async function GET(request: NextRequest) {
  try {
    if (!STREAM_SECRET) {
      return new Response("Missing stream secret", { status: 500 });
    }

    const corsOrigin = getCorsOrigin(request);

    if (!corsOrigin) {
      return new Response("Forbidden", { status: 403 });
    }

    const token = request.nextUrl.searchParams.get("token")?.trim();

    if (token) {
      const decoded = decodeToken(token);
      const upstream = await fetchUpstream(decoded.url);

      return new Response(upstream.body, {
        status: 200,
        headers: {
          "Content-Type":
            upstream.headers.get("content-type") ||
            (decoded.kind === "segment"
              ? "video/mp2t"
              : "application/octet-stream"),
          "Access-Control-Allow-Origin": corsOrigin,
          "Cache-Control": "no-store",
        },
      });
    }

    const dramaId = request.nextUrl.searchParams.get("dramaId")?.trim();
    const episode = Number(
      request.nextUrl.searchParams.get("episode") || "0",
    );

    if (!dramaId || !episode) {
      return new Response("Missing stream params", { status: 400 });
    }

    const ep = await resolveEpisodeData(dramaId, episode);
    const playUrl = pickPlayUrl(ep);

    if (!playUrl) {
      return new Response("No playable url", { status: 404 });
    }

    const upstream = await fetchUpstream(playUrl);
    const text = await upstream.text();

    const rewritten = rewritePlaylist(
      text,
      playUrl,
    );

    return new Response(rewritten, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": corsOrigin,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return new Response(e?.message || "stream failed", {
      status: 500,
    });
  }
}
