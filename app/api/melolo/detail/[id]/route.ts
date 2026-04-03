import { NextRequest, NextResponse } from "next/server";
import { adaptMeloloDramaDetail } from "@/lib/adapters/drama/melolo";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function buildDetailUrl(id: string): string {
  return `https://melolo.dramabos.my.id/api/detail/${encodeURIComponent(id)}?lang=id`;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const rawId = id?.trim();

    if (!rawId) {
      return NextResponse.json(
        { error: "Missing Melolo drama id" },
        { status: 400 },
      );
    }

    const response = await fetch(buildDetailUrl(rawId), {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Melolo detail upstream failed with status ${response.status}`,
        },
        { status: response.status },
      );
    }

    const payload = await response.json();
    const drama = adaptMeloloDramaDetail(payload);

    return NextResponse.json(
      {
        drama,
        raw: payload,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Melolo detail route error:", error);

    return NextResponse.json(
      { error: "Failed to load Melolo detail" },
      { status: 500 },
    );
  }
}