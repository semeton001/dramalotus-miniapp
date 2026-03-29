import { NextResponse } from "next/server";
import episodesData from "@/data/episodes.json";
import type { Episode } from "@/types/episode";

export async function GET() {
  const episodes = (episodesData as Episode[]).sort(
    (a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999),
  );

  return NextResponse.json(episodes);
}