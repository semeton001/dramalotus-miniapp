import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";

const STREAM_TOKEN_SECRET =
  process.env.STREAM_TOKEN_SECRET || "change-me-now";

type TokenPayload = {
  provider: "goodshort";
  dramaId: string;
  episode: number;
  type: "manifest" | "segment";
  segmentIndex?: number;
  exp: number;
};

function b64(data: string) {
  return Buffer.from(data).toString("base64url");
}

function sign(data: string) {
  return crypto
    .createHmac("sha256", STREAM_TOKEN_SECRET)
    .update(data)
    .digest("base64url");
}

function createToken(payload: TokenPayload) {
  const body = b64(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

function verifyToken(token: string): TokenPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  if (sign(body) !== sig) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString(),
    ) as TokenPayload;

    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (payload.provider !== "goodshort") return null;

    return payload;
  } catch {
    return null;
  }
}

function cors(type?: string) {
  const h = new Headers();
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Range");
  h.set(
    "Access-Control-Expose-Headers",
    "Content-Length, Content-Range, Accept-Ranges, Content-Type",
  );
  h.set("Cache-Control", "no-store");
  if (type) h.set("Content-Type", type);
  return h;
}

async function resolveDramaUrl(dramaId: string, episode: number) {
  const res = await fetch("https://www.goodshort.com/hwycreels/book/detail", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": UA,
      Accept: "application/json, text/plain, */*",
    },
    body: JSON.stringify({ bookId: dramaId }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`GoodShort upstream ${res.status}`);
  }

  const payload = await res.json();

  const chapters = Array.isArray(payload?.data?.chapterVoList)
    ? payload.data.chapterVoList
    : [];

  const chapter = chapters[episode - 1];

  if (!chapter?.m3u8Path) {
    return "";
  }

  return chapter.m3u8Path;
}

async function fetchManifest(rawUrl: string) {
  const upstream = await fetch(rawUrl, {
    headers: {
      "User-Agent": UA,
      Accept: "*/*",
      Referer: new URL(rawUrl).origin + "/",
      Origin: new URL(rawUrl).origin,
    },
    redirect: "follow",
    cache: "no-store",
  });

  if (!upstream.ok) {
    throw new Error(`Manifest fetch failed ${upstream.status}`);
  }

  return upstream.text();
}

function rewriteManifest(
  text: string,
  dramaId: string,
  episode: number,
) {
  let idx = 0;

  return text
    .split("\n")
    .map((line) => {
      const t = line.trim();

      if (!t || t.startsWith("#")) {
        return line;
      }

      const token = createToken({
        provider: "goodshort",
        dramaId,
        episode,
        type: "segment",
        segmentIndex: idx++,
        exp: Math.floor(Date.now() / 1000) + 180,
      });

      return `/api/goodshort/stream?token=${encodeURIComponent(token)}`;
    })
    .join("\n");
}

async function proxyManifest(
  dramaId: string,
  episode: number,
) {
  const rawUrl = await resolveDramaUrl(dramaId, episode);

  if (!rawUrl) {
    return NextResponse.json(
      { error: "No stream source" },
      { status: 404, headers: cors("application/json") },
    );
  }

  const text = await fetchManifest(rawUrl);

  const rewritten = rewriteManifest(
    text,
    dramaId,
    episode,
  );

  return new NextResponse(rewritten, {
    status: 200,
    headers: cors("application/vnd.apple.mpegurl; charset=utf-8"),
  });
}

async function proxySegment(
  dramaId: string,
  episode: number,
  segmentIndex: number,
) {
  const rawUrl = await resolveDramaUrl(dramaId, episode);

  if (!rawUrl) {
    return NextResponse.json(
      { error: "No stream source" },
      { status: 404, headers: cors("application/json") },
    );
  }

  const manifestText = await fetchManifest(rawUrl);
  const upstreamUrl = new URL(rawUrl);

  const segments = manifestText
    .split("\n")
    .map((x) => x.trim())
    .filter((x) => x && !x.startsWith("#"));

  const rel = segments[segmentIndex];

  if (!rel) {
    return NextResponse.json(
      { error: "Segment not found" },
      { status: 404, headers: cors("application/json") },
    );
  }

  const segmentUrl = new URL(rel, upstreamUrl).toString();

  const upstream = await fetch(segmentUrl, {
    headers: {
      "User-Agent": UA,
      Accept: "*/*",
      Referer: upstreamUrl.origin + "/",
      Origin: upstreamUrl.origin,
    },
    redirect: "follow",
    cache: "no-store",
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "Segment fetch failed" },
      { status: upstream.status },
    );
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: cors(
      upstream.headers.get("content-type") || "video/mp2t",
    ),
  });
}

async function handle(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();

  if (token) {
    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 403, headers: cors("application/json") },
      );
    }

    if (
      payload.type === "segment" &&
      typeof payload.segmentIndex === "number"
    ) {
      return proxySegment(
        payload.dramaId,
        payload.episode,
        payload.segmentIndex,
      );
    }

    if (payload.type === "manifest") {
      return proxyManifest(
        payload.dramaId,
        payload.episode,
      );
    }
  }

  const dramaId = request.nextUrl.searchParams.get("dramaId")?.trim();
  const episode = Number(
    request.nextUrl.searchParams.get("episode") || "1",
  );

  if (!dramaId) {
    return NextResponse.json(
      { error: "Missing dramaId" },
      { status: 400, headers: cors("application/json") },
    );
  }

  const signed = createToken({
    provider: "goodshort",
    dramaId,
    episode,
    type: "manifest",
    exp: Math.floor(Date.now() / 1000) + 180,
  });

  return new NextResponse(null, {
    status: 307,
    headers: {
      Location: `/api/goodshort/stream?token=${encodeURIComponent(signed)}`,
      ...Object.fromEntries(cors().entries()),
    },
  });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function HEAD(request: NextRequest) {
  return handle(request);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: cors(),
  });
}
