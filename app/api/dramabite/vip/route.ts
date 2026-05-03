import { NextResponse } from "next/server";
import {
  adaptDramabiteDramaList,
  extractDramabiteItemsDeep,
  feedResponse,
  fetchDramabiteJson,
} from "../_shared";

export async function GET() {
  try {
    const payloads = await Promise.all([
      fetchDramabiteJson("/dramas", { page: 2 }),
      fetchDramabiteJson("/dramas", { page: 3 }),
    ]);

    const items = adaptDramabiteDramaList(
      payloads.flatMap((payload) => extractDramabiteItemsDeep(payload)),
    );

    return feedResponse(items, 1);
  } catch (error) {
    console.error("DramaBite VIP route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load DramaBite VIP.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
