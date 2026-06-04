import { NextRequest, NextResponse } from "next/server";
import { fetchJson } from "../_shared";
import { createStreamToken } from "@/lib/stream-token";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const dramaId = request.nextUrl.searchParams.get("dramaId")?.trim() || "";
  const episodeNo = request.nextUrl.searchParams.get("episodeNo")?.trim() || "";

  if (!dramaId || !episodeNo) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const payload = await fetchJson(
      `/api/v1/episode/${encodeURIComponent(dramaId)}/${encodeURIComponent(episodeNo)}?lang=id_ID`
    );

    const videos = payload?.data?.videos || [];

    const preferred =
      videos.find((v:any)=>String(v?.quality) === "1080p" && v?.url) ||
      videos.find((v:any)=>String(v?.quality) === "720p" && v?.url) ||
      videos.find((v:any)=>v?.url);

    if (!preferred?.url) {
      return NextResponse.json({ ok:false }, { status:404 });
    }

    const st = createStreamToken({
      u: preferred.url,
      exp: Date.now() + 120000,
      src: "netshort",
    });

    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "tg.dramalotus.site";

    const proto =
      request.headers.get("x-forwarded-proto") || "https";

    return NextResponse.redirect(
      `${proto}://${host}/api/netshort/play?st=${encodeURIComponent(st)}`,
      302,
    );
  } catch {
    return NextResponse.json({ ok:false }, { status:500 });
  }
}
