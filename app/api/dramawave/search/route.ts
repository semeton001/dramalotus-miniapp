import { NextRequest, NextResponse } from "next/server";
import { fetchJson, errorJson } from "../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const q =
    request.nextUrl.searchParams.get("q")?.trim() ||
    request.nextUrl.searchParams.get("query")?.trim() ||
    "";

  if (!q) {
    return NextResponse.json([]);
  }

  try {
    const payload = await fetchJson(
      `/api/v1/search?q=${encodeURIComponent(q)}&limit=20`
    );

    return NextResponse.json(payload);
  } catch (error) {
    return errorJson(error);
  }
}
