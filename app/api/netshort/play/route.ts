import { NextRequest, NextResponse } from "next/server";
import { readStreamToken } from "@/lib/stream-token";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const st = req.nextUrl.searchParams.get("st") || "";
    const payload = readStreamToken(st);

    if (payload.src !== "netshort") {
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    const upstream = await fetch(payload.u, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://www.netshort.com/",
        Origin: "https://www.netshort.com",
      },
      cache: "no-store",
    });

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") || "video/mp4",
        "cache-control": "no-store",
        "accept-ranges":
          upstream.headers.get("accept-ranges") || "bytes",
        "content-length":
          upstream.headers.get("content-length") || "",
      },
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
}
