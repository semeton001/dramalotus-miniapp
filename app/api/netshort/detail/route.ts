import { NextRequest, NextResponse } from "next/server";
import { buildNetshortDrama } from "@/lib/adapters/drama/netshort";

function buildDetailUrl(dramaId: string): string {
  return `https://netshort.dramabos.my.id/api/drama/${encodeURIComponent(dramaId)}?lang=in`;
}

export async function GET(request: NextRequest) {
  const dramaId = request.nextUrl.searchParams.get("dramaId")?.trim() || "";

  if (!dramaId) {
    return NextResponse.json(
      { error: "dramaId is required." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(buildDetailUrl(dramaId), {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Netshort detail failed: ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    const drama = buildNetshortDrama(data, 0, "detail", "5");

    if (!drama) {
      return NextResponse.json(
        { error: "Invalid Netshort detail payload." },
        { status: 502 },
      );
    }

    return NextResponse.json(drama);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Netshort detail.",
      },
      { status: 500 },
    );
  }
}
