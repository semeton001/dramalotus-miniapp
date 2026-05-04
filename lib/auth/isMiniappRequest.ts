import { NextRequest } from "next/server";

export function isMiniappRequest(request: NextRequest) {
  if (request.nextUrl.searchParams.get("miniapp") === "1") {
    return true;
  }

  const referer = request.headers.get("referer") || "";

  try {
    const url = new URL(referer);
    return url.pathname === "/tg" || url.pathname.startsWith("/tg/");
  } catch {
    return referer.includes("/tg");
  }
}
