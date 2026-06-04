import { NextRequest } from "next/server";
import {
  extractStardustItemsDeep,
  adaptStardustDramaList,
  fetchStardustJson,
  feedResponse,
} from "../_shared";

export async function GET(request: NextRequest) {
  const q =
    request.nextUrl.searchParams.get("q")?.trim() ||
    request.nextUrl.searchParams.get("query")?.trim() ||
    "";

  if (!q) {
    return feedResponse([]);
  }

  const payload = await fetchStardustJson(
    `/search?q=${encodeURIComponent(q)}&lang=id&page=1&page_size=10`
  );

  return feedResponse(
    adaptStardustDramaList(extractStardustItemsDeep(payload))
  );
}
