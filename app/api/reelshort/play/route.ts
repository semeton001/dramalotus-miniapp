import { NextRequest, NextResponse } from "next/server";
import { readStreamToken, createStreamToken } from "@/lib/stream-token";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function absolutize(base: string, value: string) {
  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
}

export async function GET(req: NextRequest) {
  try {
    const st = req.nextUrl.searchParams.get("st") || "";
    const payload = readStreamToken(st);

    const upstream = await fetch(payload.u, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://captain.sapimu.au/",
        Origin: "https://captain.sapimu.au",
      },
      cache: "no-store",
    });

    const contentType =
      upstream.headers.get("content-type") || "";

    if (contentType.includes("mpegurl") || payload.u.includes(".m3u8")) {
      const text = await upstream.text();

      const rewritten = text
        .split("\n")
        .map((line) => {
          const trimmed = line.trim();

          if (!trimmed || trimmed.startsWith("#")) {
            return line;
          }

          const abs = absolutize(payload.u, trimmed);

          const nextToken = createStreamToken({
            u: abs,
            exp: Date.now() + 120000,
            src: "reelshort",
          });

          return `/api/reelshort/play?st=${encodeURIComponent(nextToken)}`;
        })
        .join("\n");

      return new NextResponse(rewritten, {
        status: upstream.status,
        headers: {
          "content-type": "application/vnd.apple.mpegurl",
          "cache-control": "no-store",
        },
      });
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ||
          "application/octet-stream",
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
}
