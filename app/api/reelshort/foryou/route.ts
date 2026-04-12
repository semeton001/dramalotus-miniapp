import { NextRequest } from "next/server";
import { respondDramaFeed } from "../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")?.trim() || "1") || 1);
  return respondDramaFeed(`https://reelshort.dramabos.my.id/home?tab=for-you&lang=id&page=${page}`, page);
}
