import { NextResponse } from "next/server";
import { buildViglooApiUrl, VIGLOO_HEADERS } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const res = await fetch(
    buildViglooApiUrl("/vigloo/api/v1/search?q=love"),
    {
      cache: "no-store",
      headers: VIGLOO_HEADERS,
    },
  );

  const json = await res.json();

  return NextResponse.json(json.payloads?.[0] ?? json);
}
