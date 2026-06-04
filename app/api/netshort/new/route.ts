import { NextResponse } from "next/server";
import { fetchJson, normalize, toErrorResponse } from "../_shared";

export async function GET() {
  try {
    const payload = await fetchJson("/api/v1/new/1?lang=id_ID");
    return NextResponse.json(normalize(payload, "home"));
  } catch (error) {
    return toErrorResponse(error, "Failed to load Netshort new.");
  }
}
