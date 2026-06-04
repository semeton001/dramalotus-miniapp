import { NextResponse } from "next/server";
import { fetchIdramaJson, normalizeDramaList } from "../_shared";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function GET() {
  try {
    const payload = await fetchIdramaJson("/popular", {
      page: 1,
      limit: 50,
    });

    const items = shuffle(normalizeDramaList(payload)).slice(0, 20);

    return NextResponse.json({
      items,
      hasNextPage: false,
      page: 1,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load iDrama random.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
