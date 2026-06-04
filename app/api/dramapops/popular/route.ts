import { NextResponse } from "next/server";
import {
  adaptDramapopsDramaList,
  extractDramapopsItemsDeep,
  feedResponse,
  fetchDramapopsJson,
} from "../_shared";

export async function GET() {
  try {
    const payload = await fetchDramapopsJson("/dramas/popular", { limit: 20 });
    const items = adaptDramapopsDramaList(extractDramapopsItemsDeep(payload));
    return feedResponse(items, 1);
  } catch (error) {
    console.error("Dramapops popular route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load Dramapops popular.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
