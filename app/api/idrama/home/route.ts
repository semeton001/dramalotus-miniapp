import { NextResponse } from "next/server";
import { fetchIdramaJson, normalizeDramaList } from "../_shared";

export async function GET() {
  const payloads = await Promise.all([
    fetchIdramaJson("/ranking/hits", { page: 1, limit: 20 }),
    fetchIdramaJson("/genre/section_96c34d71", { page: 1, limit: 20 }),
    fetchIdramaJson("/genre/section_6ef00d1d", { page: 1, limit: 20 }),
  ]);

  const merged = payloads.flatMap(normalizeDramaList);

  const dedupe = Array.from(
    new Map(merged.map((x) => [x.id, x])).values(),
  );

  return NextResponse.json({
    items: dedupe,
    hasNextPage: false,
    page: 1,
  });
}
