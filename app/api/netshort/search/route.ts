import { NextRequest, NextResponse } from "next/server";
import { fetchJson, normalize, toErrorResponse } from "../_shared";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim() || "";

  if (!query) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  try {
    const payload = await fetchJson(
      `/api/v1/search/${encodeURIComponent(query)}/1?lang=id_ID`
    );

    return NextResponse.json(normalize(payload, "search"));
  } catch (error) {
    return toErrorResponse(error, "Failed to search Netshort.");
  }
}
