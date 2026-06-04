import { NextResponse } from "next/server";
import { fetchDramaBoxHomePage } from "../_shared";

export async function GET() {
  try {
    const data = await fetchDramaBoxHomePage(1);

    const items =
      data?.data?.data?.classifyBookList?.records ?? [];

    return NextResponse.json({
      items,
      hasNextPage: false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Home failed",
      },
      { status: 500 },
    );
  }
}
