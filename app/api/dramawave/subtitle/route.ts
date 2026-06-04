import { NextRequest, NextResponse } from "next/server";
import { fetchJson, errorJson } from "../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const dramaId = request.nextUrl.searchParams.get("dramaId")?.trim() || "";
  const episode =
    request.nextUrl.searchParams.get("episode")?.trim() || "1";

  if (!dramaId) {
    return new NextResponse("", {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "access-control-allow-origin": "*",
        "cache-control": "no-store",
      },
    });
  }

  try {
    const payload = await fetchJson(
      `/api/v1/dramas/${encodeURIComponent(dramaId)}/play/${encodeURIComponent(episode)}?lang=id-ID`
    );

    const subtitles = Array.isArray(payload?.data?.subtitle_list)
      ? payload.data.subtitle_list
      : [];

    const indo =
      subtitles.find((s: any) => s?.language === "id-ID") ||
      subtitles.find((s: any) => s?.language?.startsWith("id")) ||
      subtitles[0];

    const subtitleUrl = indo?.subtitle || "";

    if (!subtitleUrl) {
      return new NextResponse("", {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "access-control-allow-origin": "*",
          "cache-control": "no-store",
        },
      });
    }

    const upstream = await fetch(subtitleUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return new NextResponse("", {
        status: upstream.status,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "access-control-allow-origin": "*",
          "cache-control": "no-store",
        },
      });
    }

    const text = await upstream.text();

    return new NextResponse(text, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "access-control-allow-origin": "*",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return errorJson(error);
  }
}
