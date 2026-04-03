import { NextResponse } from "next/server";

import { normalizeDramawaveEpisodes } from "@/lib/adapters/episode/dramawave";
import type { Episode } from "@/types/episode";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dramaId = searchParams.get("dramaId")?.trim() || "";
    const numericDramaId = Number(searchParams.get("numericDramaId") || "0");

    if (!dramaId) {
      return NextResponse.json(
        { error: "Query dramaId wajib diisi." },
        { status: 400 },
      );
    }

    const upstreamUrl = `https://dramawave.dramabos.my.id/api/drama/${encodeURIComponent(
      dramaId,
    )}?lang=in&code=4D96F22760EA30FB0FFBA9AA87A979A6`;

    const response = await fetch(upstreamUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Gagal memuat episode Dramawave. status=${response.status}` },
        { status: response.status },
      );
    }

    const payload = await response.json();

    const episodes = normalizeDramawaveEpisodes(
      payload,
      Number.isFinite(numericDramaId) && numericDramaId > 0
        ? numericDramaId
        : 1,
    ).map((episode) => {
      const subtitleUrl = episode.subtitleUrl?.trim();

      return {
        ...episode,
        subtitleUrl: subtitleUrl
          ? `/api/dramawave/subtitle?url=${encodeURIComponent(subtitleUrl)}`
          : undefined,
      } satisfies Episode;
    });

    return NextResponse.json(episodes);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat episode Dramawave.",
      },
      { status: 500 },
    );
  }
}