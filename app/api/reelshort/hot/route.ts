import { NextRequest } from "next/server";

const TARGET = "https://api.dramalotus.site/api/reelshort/trending";

async function handler(req: NextRequest) {
  const qs = req.nextUrl.search || "";

  const upstream = await fetch(TARGET + qs, {
    method: req.method,
    headers: {
      Accept: req.headers.get("accept") || "*/*",
      "User-Agent":
        req.headers.get("user-agent") ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      Authorization: req.headers.get("authorization") || "",
      "Content-Type":
        req.headers.get("content-type") || "application/json",
    },
    body:
      req.method === "GET" || req.method === "HEAD"
        ? undefined
        : await req.text(),
    redirect: "follow",
    cache: "no-store",
  });

  const body = await upstream.text();

  return new Response(body, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") || "application/json",
      "cache-control":
        upstream.headers.get("cache-control") || "no-store",
    },
  });
}

export { handler as GET, handler as POST };
