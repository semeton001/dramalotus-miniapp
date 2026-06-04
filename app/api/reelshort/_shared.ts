import { NextResponse } from "next/server";

const DEFAULT_HEADERS = {
  Authorization: `Bearer ${process.env.REELSHORT_BEARER_TOKEN || ""}`,
  "User-Agent": "Mozilla/5.0",
  Referer: "https://captain.sapimu.au/",
  Origin: "https://captain.sapimu.au",
  Accept: "application/json, text/plain, */*",
};

export async function respondDramaFeed(url: string) {
  const res = await fetch(url, {
    headers: DEFAULT_HEADERS,
    cache: "no-store",
  });

  const text = await res.text();

  return new NextResponse(text, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") || "application/json",
    },
  });
}
