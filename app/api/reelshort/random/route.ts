import { NextRequest } from "next/server";
import { respondDramaFeed } from "../_shared";

export async function GET(request: NextRequest) {
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")?.trim() || "1") || 1);
  return respondDramaFeed(`https://api.sansekai.my.id/api/reelshort/random?page=${page}`, page);
}
