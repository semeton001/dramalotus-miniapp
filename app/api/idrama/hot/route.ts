import { NextResponse } from "next/server";
import {
  IDRAMA_HOT_TAB_ID,
  fetchIdramaJson,
  flattenTabModulesToDramas,
} from "../_shared";

export async function GET() {
  try {
    const payload = await fetchIdramaJson(`/tab/${IDRAMA_HOT_TAB_ID}`);
    return NextResponse.json(flattenTabModulesToDramas(payload, "Hot"));
  } catch (error) {
    console.error("iDrama hot route error:", error);
    return NextResponse.json(
      { error: "Failed to load iDrama hot." },
      { status: 500 },
    );
  }
}
