import { NextRequest, NextResponse } from "next/server";
import { fetchDramaBoxPlay } from "../_shared";

export async function GET(request: NextRequest) {
  const bookId =
    request.nextUrl.searchParams.get("bookId")?.trim() || "";

  const episode = Number(
    request.nextUrl.searchParams.get("episode") || "1",
  );

  if (!bookId) {
    return NextResponse.json(
      { error: "bookId is required" },
      { status: 400 },
    );
  }

  try {
    const payload = await fetchDramaBoxPlay(
      bookId,
      Number.isFinite(episode) ? episode : 1,
    );

    const data = payload?.data || {};
    const videos = data?.videos || {};

    const target =
      videos["1080"] ||
      videos["720"] ||
      videos["540"];

    if (!target) {
      return NextResponse.json(
        { error: "No stream available" },
        { status: 404 },
      );
    }

    return NextResponse.redirect(target, 307);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Stream failed",
      },
      { status: 500 },
    );
  }
}
