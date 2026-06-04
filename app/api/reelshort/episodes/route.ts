import { NextRequest, NextResponse } from "next/server";

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

  const dramaId =
    request.nextUrl.searchParams.get("id")?.trim() ||
    request.nextUrl.searchParams.get("dramaId")?.trim() ||
    "";

  if (!dramaId) {
    return NextResponse.json([], { status: 200 });
  }

  const res = await fetch(
    `${base}/book/${encodeURIComponent(dramaId)}/chapters?lang=in`,
    {
      headers: headers(token),
      cache: "no-store",
    },
  );

  const json = await res.json().catch(() => ({}));

  const chapters = Array.isArray(json?.data?.chapters)
    ? json.data.chapters
    : [];

  const episodes = chapters.map((ch: any, index: number) => ({
    id: ch.chapter_id || ch.video_id || `ep-${index + 1}`,
    reelShortEpisodeId: ch.chapter_id || "",
    reelShortVideoId: ch.video_id || ch.chapter_id || "",
    episodeNumber:
      Number(ch.serial_number || ch.episode || index + 1) || index + 1,
    title:
      ch.chapter_title ||
      ch.title ||
      `Episode ${Number(ch.serial_number || index + 1)}`,
    isLocked: false,
    videoUrl: `/api/reelshort/stream?id=${encodeURIComponent(dramaId)}&episodeId=${encodeURIComponent(
      ch.chapter_id || ch.video_id || "",
    )}`,
  }));

  return NextResponse.json(episodes);
}
