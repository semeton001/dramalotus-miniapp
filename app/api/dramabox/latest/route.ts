import { NextResponse } from "next/server";
import { fetchDramaBoxRanking } from "../_shared";

export async function GET() {
  try {
    const data = await fetchDramaBoxRanking();

    const items =
      data?.data?.data?.rankList ?? [];

    return NextResponse.json({
      items,
      hasNextPage: false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Ranking failed",
      },
      { status: 500 },
    );
  }
}
