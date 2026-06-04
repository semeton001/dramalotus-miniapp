import { NextRequest, NextResponse } from "next/server";
import { fetchJson, errorJson } from "../../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        { error: "id required" },
        { status: 400 },
      );
    }

    const payload = await fetchJson(
      `/api/v1/dramas/${encodeURIComponent(id)}?lang=id-ID`
    );

    return NextResponse.json(payload);
  } catch (error) {
    return errorJson(error);
  }
}
