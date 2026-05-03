import { NextRequest, NextResponse } from "next/server";
import {
  fetchAndNormalizeNetshortForYou,
  toErrorResponse,
} from "../_shared";

export async function GET(request: NextRequest) {
  const pageParam = request.nextUrl.searchParams.get("page") ?? "1";
  const page = Number(pageParam);

  if (!Number.isFinite(page) || page < 1) {
    return NextResponse.json(
      { error: "page must be a positive number." },
      { status: 400 },
    );
  }

  try {
    const dramas = await fetchAndNormalizeNetshortForYou(page);
    return NextResponse.json(dramas);
  } catch (error) {
    return toErrorResponse(error, "Failed to load Netshort ForYou.");
  }
}