import { NextResponse } from "next/server";
import {
adaptReelifeDramaList,
extractFeedItems,
jsonFeed,
reelifeFetch,
} from "../_shared";

export async function GET() {
try {
const payloads = await Promise.all([
reelifeFetch("/dramas?tab=0&page=1&size=20"),
reelifeFetch("/dramas?tab=0&page=2&size=20"),
reelifeFetch("/dramas?tab=0&page=3&size=20"),
]);

const items = payloads.flatMap((payload) =>
  adaptReelifeDramaList(
    extractFeedItems(payload),
  ),
);

return jsonFeed(items, 1, false);

} catch (error) {
console.error("Reelife home route error:", error);

return NextResponse.json(
  {
    error:
      error instanceof Error
        ? error.message
        : "Unknown Reelife home error",
  },
  { status: 500 },
);

}
}
