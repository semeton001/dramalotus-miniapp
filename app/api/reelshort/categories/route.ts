import { NextResponse } from "next/server";

const BASE =
  process.env.REELSHORT_API_BASE ||
  "https://captain.sapimu.au/reelshort/api/v1";

const HEADERS = {
  Authorization: `Bearer ${process.env.REELSHORT_BEARER_TOKEN || ""}`,
  "User-Agent": "Mozilla/5.0",
  Referer: "https://captain.sapimu.au/",
  Origin: "https://captain.sapimu.au",
  Accept: "application/json, text/plain, */*",
};

export async function GET() {
  const res = await fetch(`${BASE}/feed/44421?lang=in`, {
    headers: HEADERS,
    cache: "no-store",
  });

  const json = await res.json();

  const tabs =
    json?.data?.tab_list?.map((tab: any) => ({
      id: tab.tab_id,
      name: tab.tab_name,
      category: tab.tab_category ?? null,
      current: Boolean(tab.is_current),
    })) || [];

  return NextResponse.json(tabs);
}
