import { NextRequest } from "next/server";

const TARGET = "https://api.dramalotus.site/api/dramabox/image";

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.search || "";

  const upstream = await fetch(TARGET + qs, {
    method: "GET",
    headers: {
      Accept: req.headers.get("accept") || "image/*,*/*",
      "User-Agent":
        req.headers.get("user-agent") ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    },
    cache: "force-cache",
    redirect: "follow",
  });

  const body = await upstream.arrayBuffer();

  return new Response(body, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") || "image/jpeg",
      "cache-control":
        upstream.headers.get("cache-control") ||
        "public, max-age=86400",
    },
  });
}
