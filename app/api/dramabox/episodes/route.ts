import { NextResponse } from "next/server";
import { adaptDramaBoxEpisodeList } from "@/lib/adapters/episode";

async function fetchDramaBoxEpisodeList(bookId: string) {
  const response = await fetch(
    `https://dramabox.dramabos.my.id/api/v1/allepisode?bookId=${bookId}&lang=in&code=4D96F22760EA30FB0FFBA9AA87A979A6`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `DramaBox allepisode request failed with status ${response.status}`,
    );
  }

  return response.json();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get("bookId");

  if (!bookId || !/^\d+$/.test(bookId)) {
    return NextResponse.json(
      { error: "bookId must be a valid numeric string" },
      { status: 400 },
    );
  }

  try {
    const rawItems = await fetchDramaBoxEpisodeList(bookId);
    const episodeItems = Array.isArray(rawItems) ? rawItems : [];
    const episodes = adaptDramaBoxEpisodeList(episodeItems, Number(bookId));

    return NextResponse.json(episodes);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch DramaBox episodes",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}