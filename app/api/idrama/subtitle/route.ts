import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")?.trim() || "";
  if (!url) {
    return new Response("url wajib diisi.", { status: 400 });
  }

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    return new Response("Gagal memuat subtitle iDrama.", { status: 502 });
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") || "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
