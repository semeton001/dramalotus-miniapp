import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE =
  "https://captain.sapimu.au/reelshort/api/v1/search";

const AUTH_TOKEN = process.env.REELSHORT_BEARER_TOKEN || "";

export async function GET(req: NextRequest) {
  const q =
    req.nextUrl.searchParams.get("q") ||
    req.nextUrl.searchParams.get("query") ||
    "";

  const page =
    req.nextUrl.searchParams.get("page") || "1";

  if (!q.trim()) {
    return NextResponse.json([]);
  }

  if (!AUTH_TOKEN) {
    return NextResponse.json(
      { error: "REELSHORT_BEARER_TOKEN missing" },
      { status: 500 }
    );
  }

  const url =
    `${API_BASE}?q=${encodeURIComponent(q)}` +
    `&page=${page}` +
    `&lang=in`;

  const upstream = await fetch(url, {
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
      Referer: "https://captain.sapimu.au/",
      Origin: "https://captain.sapimu.au",
    },
    cache: "no-store",
  });

  const json = await upstream.json();

  const items = Array.isArray(json?.data?.lists)
    ? json.data.lists
    : [];

  const dramas = items.map((item: any, index: number) => ({
    id:
      Number(
        String(
          item?.t_book_id ||
          item?.book_id ||
          item?._id ||
          index + 1
        ).replace(/\D/g, "").slice(-12)
      ) || index + 1,

    title: String(item?.book_title || "").trim(),

    description: String(
      item?.special_desc ||
      item?.share_text ||
      ""
    ).trim(),

    posterImage: String(
      item?.book_pic || ""
    ).trim(),

    coverImage: String(
      item?.book_pic || ""
    ).trim(),

    totalEpisodes: Number(
      item?.chapter_count || 0
    ),

    source: "reelshort",
    sourceId: "2",
    sourceName: "ReelShort",

    reelShortRawId:
      item?.book_id ||
      item?._id ||
      "",

    badge: "ReelShort",
  }));

  return NextResponse.json(
    dramas,
    { status: upstream.ok ? 200 : upstream.status }
  );
}
