import { NextRequest, NextResponse } from "next/server";
import {
  createStreamToken,
  readStreamToken,
} from "@/lib/stream-token";

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
    const st =
      req.nextUrl.searchParams.get("st") || "";

    const payload = readStreamToken(st);

    const upstream = await fetch(payload.u, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://captain.sapimu.au/",
        Origin: "https://captain.sapimu.au",
        ...(payload.c
          ? {
              Cookie: payload.c,
            }
          : {}),
      },
    });

    const contentType =
      upstream.headers.get("content-type") || "";

    const isPlaylist =
      payload.u.includes(".m3u8") ||
      contentType.includes("mpegurl");

    if (isPlaylist) {
      const text = await upstream.text();

      const rewritten = text
        .split("\n")
        .map((line) => {
          const trimmed = line.trim();

          if (!trimmed) {
            return line;
          }

          if (trimmed.startsWith("#")) {
            return line.replace(
              /URI="([^"]+)"/g,
              (_m, uri) => {
                const abs = absolutize(
                  payload.u,
                  uri,
                );

                const nextToken =
                  createStreamToken({
                    u: abs,
                    c: payload.c,
                    src: "vigloo",
                    exp:
                      Date.now() +
                      5 * 60 * 1000,
                  });

                return `URI="/api/vigloo/play?st=${encodeURIComponent(
                  nextToken,
                )}"`;
              },
            );
          }

          const abs = absolutize(
            payload.u,
            trimmed,
          );

          const nextToken =
            createStreamToken({
              u: abs,
              c: payload.c,
              src: "vigloo",
              exp:
                Date.now() +
                5 * 60 * 1000,
            });

          return `/api/vigloo/play?st=${encodeURIComponent(
            nextToken,
          )}`;
        })
        .join("\n");

      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          "content-type":
            "application/vnd.apple.mpegurl",
          "cache-control": "no-store",
          "access-control-allow-origin":
            "*",
        },
      });
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get(
            "content-type",
          ) || "application/octet-stream",
        "cache-control": "no-store",
        "access-control-allow-origin":
          "*",
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error:
          e instanceof Error
            ? e.message
            : "forbidden",
      },
      {
        status: 403,
      },
    );
  }
}
