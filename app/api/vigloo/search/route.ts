import { NextRequest, NextResponse } from "next/server";
import { buildViglooApiUrl, VIGLOO_HEADERS } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const query =
      request.nextUrl.searchParams.get("q")?.trim() || "";

    if (!query) {
      return NextResponse.json([]);
    }

    const response = await fetch(
      buildViglooApiUrl(
        `/vigloo/api/v1/search?q=${encodeURIComponent(query)}`,
      ),
      {
        cache: "no-store",
        headers: VIGLOO_HEADERS,
      },
    );

    const json = await response.json();

    const payloads = Array.isArray(json?.payloads)
      ? json.payloads
      : [];

    const dramas = payloads.map((item: any) => ({
      id: Number(item.id),
      title: item.title || "",
      description:
        item.logLine ||
        item.description ||
        "",
      thumbnail:
        item?.thumbnails?.[0]?.url ||
        item.thumbnailExpanded ||
        item.bannerImage ||
        "",
      source: "vigloo",
      sourceName: "Vigloo",
      slug: `vigloo-${item.id}`,
      episodeCount: item.episodeCount || 0,
      viglooDramaId: String(item.id),
      viglooSeasonId:
        item?.seasons?.[0]?.id
          ? String(item.seasons[0].id)
          : "",
    }));

    return NextResponse.json(dramas);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}
