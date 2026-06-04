import { NextRequest, NextResponse } from "next/server";
import { createStreamToken } from "@/lib/stream-token";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "User-Agent": "Mozilla/5.0",
    Referer: "https://captain.sapimu.au/",
    Origin: "https://captain.sapimu.au",
    Accept: "application/json, text/plain, */*",
  };
}

export async function GET(request: NextRequest) {
  const base = process.env.REELSHORT_API_BASE!;
  const token = process.env.REELSHORT_BEARER_TOKEN!;

  const id = request.nextUrl.searchParams.get("id")?.trim() || "";
  const episodeId = request.nextUrl.searchParams.get("episodeId")?.trim() || "";

  if (!id || !episodeId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const res = await fetch(
    `${base}/book/${encodeURIComponent(id)}/chapter/${encodeURIComponent(episodeId)}/video`,
    {
      headers: headers(token),
      cache: "no-store",
    },
  );

  const json = await res.json().catch(() => null);

  const videos = json?.data?.videos || [];

  const preferred =
    videos.find((v: any) => v?.Encode === "H264" && Number(v?.Dpi) === 1080 && v?.PlayURL) ||
    videos.find((v: any) => v?.Encode === "H264" && v?.PlayURL) ||
    videos.find((v: any) => v?.PlayURL);

  if (!preferred?.PlayURL) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const st = createStreamToken({
    u: preferred.PlayURL,
    exp: Date.now() + 120000,
    src: "reelshort",
  });

  return NextResponse.json({
    ok: true,
    url: `/api/reelshort/play?st=${encodeURIComponent(st)}`,
  });
}
