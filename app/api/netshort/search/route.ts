import { NextRequest, NextResponse } from "next/server";
import { normalizeNetshortFeed } from "@/lib/adapters/drama/netshort";
import {
  NETSHORT_DRAMABOS_BASE_URL,
  NETSHORT_SANSEKAI_BASE_URL,
  fetchJson,
  toErrorResponse,
} from "../_shared";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";

  if (!query) {
    return NextResponse.json({ error: "query is required." }, { status: 400 });
  }

  try {
    let data: unknown;

    try {
      data = await fetchJson(
        `${NETSHORT_DRAMABOS_BASE_URL}/search?lang=in&q=${encodeURIComponent(query)}&page=1`,
      );
    } catch {
      data = await fetchJson(
        `${NETSHORT_SANSEKAI_BASE_URL}/search?query=${encodeURIComponent(query)}`,
      );
    }

    const dramas = normalizeNetshortFeed(data, "search", "5");
    return NextResponse.json(dramas);
  } catch (error) {
    return toErrorResponse(error, "Failed to load Netshort search.");
  }
}