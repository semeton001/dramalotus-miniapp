import {
  extractStardustItemsDeep,
  adaptStardustDramaList,
  fetchStardustJson,
  feedResponse,
} from "../_shared";

export async function GET() {
  const payloads = await Promise.all([
    fetchStardustJson("/homepage?lang=id"),
    fetchStardustJson("/category/1?lang=id&page=1&page_size=10"),
    fetchStardustJson("/category/15?lang=id&page=1&page_size=10"),
  ]);

  const merged = payloads.flatMap((p) => extractStardustItemsDeep(p));
  return feedResponse(adaptStardustDramaList(merged));
}
