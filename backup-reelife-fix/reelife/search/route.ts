import { NextRequest, NextResponse } from "next/server";
import {
adaptReelifeDramaList,
extractFeedItems,
jsonFeed,
reelifeFetch,
} from "../_shared";

export async function GET(request: NextRequest) {
try {
const query =
request.nextUrl.searchParams.get("query")?.trim() ||
request.nextUrl.searchParams.get("q")?.trim() ||
"";


if (!query) {
  return jsonFeed([], 1, false);
}

const payload =
  await reelifeFetch(
    "/search/suggest?q=" + encodeURIComponent(query),
  );

const items =
  adaptReelifeDramaList(
    extractFeedItems(payload),
  );

return jsonFeed(items, 1, false);


} catch (error) {
console.error("Reelife search route error:", error);


return NextResponse.json(
  {
    error:
      error instanceof Error
        ? error.message
        : "Unknown Reelife search error",
  },
  { status: 500 },
);


}
}
