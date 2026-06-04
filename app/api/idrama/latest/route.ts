import { NextResponse } from "next/server";
import { fetchIdramaJson, normalizeDramaList } from "../_shared";

export async function GET() {
  const payload = await fetchIdramaJson("/latest", {
    page: 1,
    limit: 20,
  });

  return NextResponse.json({
    items: normalizeDramaList(payload),
    hasNextPage: false,
    page: 1,
  });
}
