import { NextRequest, NextResponse } from "next/server";
import {
adaptReelifeEpisode,
createStableNumericId,
reelifeFetch,
} from "../_shared";

export async function GET(request: NextRequest) {
try {
const dramaId =
request.nextUrl.searchParams.get("dramaId")?.trim() || "";


if (!dramaId) {
  return NextResponse.json(
    { error: "Missing dramaId" },
    { status: 400 },
  );
}

const payload =
  await reelifeFetch(
    "/dramas/" + encodeURIComponent(dramaId) + "/chapters",
  );

const chapterList =
  (payload as any)?.data?.chapterList || [];

const numericDramaId =
  createStableNumericId(dramaId);

const episodes =
  chapterList.map((item: any, index: number) =>
    adaptReelifeEpisode(item, {
      numericDramaId,
      dramaId,
      index,
    }),
  );

return NextResponse.json(episodes, {
  headers: {
    "Cache-Control": "no-store",
  },
});


} catch (error) {
console.error("Reelife episodes route error:", error);


return NextResponse.json(
  {
    error:
      error instanceof Error
        ? error.message
        : "Unknown Reelife episodes error",
  },
  { status: 500 },
);


}
}
