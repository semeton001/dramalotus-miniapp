import { NextResponse } from "next/server";
import { fetchDramaBoxVip } from "../_shared";

export async function GET() {
  try {
    const data = await fetchDramaBoxVip();

    const items =
      data?.data?.data?.recommendList?.records ?? [];

    return NextResponse.json({
      items,
      hasNextPage: false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "VIP failed",
      },
      { status: 500 },
    );
  }
}
