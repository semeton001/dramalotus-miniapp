import { NextRequest, NextResponse } from "next/server";
import { createProxyHeaders, jsonError } from "../_shared";

export async function GET(request: NextRequest) {
  const upstreamUrl = request.nextUrl.searchParams.get("url")?.trim() ?? "";

  if (!upstreamUrl) {
    return jsonError("Missing subtitle url.", 400);
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        accept: "*/*",
        "user-agent": "Mozilla/5.0",
      },
    });

    if (!upstream.ok) {
      return jsonError(
        `GoodShort subtitle upstream error ${upstream.status}.`,
        upstream.status,
      );
    }

    const headers = createProxyHeaders(upstream, false);
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Gagal memuat subtitle GoodShort.",
      500,
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,OPTIONS",
      "access-control-allow-headers": "*",
    },
  });
}
