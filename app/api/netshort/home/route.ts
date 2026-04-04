import { NextResponse } from "next/server";
import { normalizeNetshortFeed } from "@/lib/adapters/drama/netshort";
import {
  NETSHORT_DRAMABOS_BASE_URL,
  fetchJson,
  toErrorResponse,
} from "../_shared";

export async function GET() {
  try {
    const data = await fetchJson(
      `${NETSHORT_DRAMABOS_BASE_URL}/home/1?lang=in`,
    );

    const dramas = normalizeNetshortFeed(data, "home", "5");
    return NextResponse.json(dramas);
  } catch (error) {
    return toErrorResponse(error, "Failed to load Netshort home.");
  }
}