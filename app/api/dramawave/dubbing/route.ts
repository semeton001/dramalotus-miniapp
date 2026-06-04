import { NextResponse } from "next/server";
import { fetchJson, errorJson } from "../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const payload = await fetchJson(
      "/api/v1/feed/dubbing?page=1&lang=id-ID"
    );

    return NextResponse.json(payload);
  } catch (error) {
    return errorJson(error);
  }
}
