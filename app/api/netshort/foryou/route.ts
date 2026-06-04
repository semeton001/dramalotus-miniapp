import { NextResponse } from "next/server";
import { fetchJson, normalize, toErrorResponse } from "../_shared";

export async function GET() {
  try {
    const payload = await fetchJson("/api/v1/dubbing/1?lang=id_ID");
    return NextResponse.json(normalize(payload, "foryou"));
  } catch (error) {
    return toErrorResponse(error, "Failed to load Netshort foryou.");
  }
}
