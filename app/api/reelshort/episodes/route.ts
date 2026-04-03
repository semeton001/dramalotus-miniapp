import { NextRequest, NextResponse } from "next/server";
import { adaptReelShortEpisodes } from "@/lib/adapters/episode/reelshort";

type DetailRecord = Record<string, unknown>;

function getString(record: DetailRecord, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

function buildCommonHeaders() {
  return {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  };
}

export async function GET(request: NextRequest) {
  try {
    const reelShortId = request.nextUrl.searchParams.get("id")?.trim() ?? "";
    const inputCode = request.nextUrl.searchParams.get("code")?.trim() ?? "";
    const dramaIdParam = request.nextUrl.searchParams.get("dramaId")?.trim() ?? "";

    if (!reelShortId) {
      return NextResponse.json(
        { error: "Parameter id wajib diisi." },
        { status: 400 },
      );
    }

    const dramaId = Number(dramaIdParam || 0);
    const headers = buildCommonHeaders();

    const detailResponse = await fetch(
      `https://reelshort.dramabos.my.id/detail/${encodeURIComponent(reelShortId)}?lang=in`,
      {
        method: "GET",
        cache: "no-store",
        headers,
      },
    );

    const detailText = await detailResponse.text();

    if (!detailResponse.ok) {
      return NextResponse.json(
        {
          error: `Upstream ReelShort detail gagal. status=${detailResponse.status}`,
          upstreamBody: detailText,
          requestedId: reelShortId,
        },
        { status: detailResponse.status },
      );
    }

    const detailPayload = detailText ? JSON.parse(detailText) : {};
    const detailRecord =
      detailPayload && typeof detailPayload === "object"
        ? (detailPayload as DetailRecord)
        : {};

    const resolvedId = getString(detailRecord, "id") || reelShortId;
    const resolvedCode =
      inputCode ||
      getString(detailRecord, "code", "bookCode", "contentCode", "shareCode") ||
      "4D96F22760EA30FB0FFBA9AA87A979A6";

    const allEpisodesUrl = `https://reelshort.dramabos.my.id/allepisodes/${encodeURIComponent(resolvedId)}?code=${encodeURIComponent(resolvedCode)}`;

    let upstreamResponse = await fetch(allEpisodesUrl, {
      method: "GET",
      cache: "no-store",
      headers,
    });

    let rawText = await upstreamResponse.text();

    if (!upstreamResponse.ok) {
      const chaptersUrl = `https://reelshort.dramabos.my.id/chapters/${encodeURIComponent(resolvedId)}?lang=id&code=${encodeURIComponent(resolvedCode)}`;

      upstreamResponse = await fetch(chaptersUrl, {
        method: "GET",
        cache: "no-store",
        headers,
      });

      rawText = await upstreamResponse.text();
    }

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        {
          error: `Upstream ReelShort episodes gagal. status=${upstreamResponse.status}`,
          upstreamBody: rawText,
          requestedId: reelShortId,
          resolvedId,
          resolvedCode,
        },
        { status: upstreamResponse.status },
      );
    }

    const payload = JSON.parse(rawText);
    const normalizedDramaId =
      Number.isFinite(dramaId) && dramaId > 0 ? dramaId : Date.now();

    return NextResponse.json(
      adaptReelShortEpisodes(payload, normalizedDramaId),
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal memuat episode ReelShort.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}