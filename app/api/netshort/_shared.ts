import { NextResponse } from "next/server";
import type { Drama } from "@/types/drama";
import { normalizeNetshortFeed } from "@/lib/adapters/drama/netshort";

export const NETSHORT_BASE_URL =
  process.env.NETSHORT_BASE?.trim() || "https://captain.sapimu.au/netshort";

export const NETSHORT_TOKEN =
  process.env.NETSHORT_TOKEN?.trim() || "";

export const NETSHORT_SOURCE_ID = "5";

function buildHeaders() {
  return {
    Accept: "application/json, text/plain, */*",
    Authorization: `Bearer ${NETSHORT_TOKEN}`,
    "User-Agent": "Mozilla/5.0",
  };
}

export async function fetchJson(path: string) {
  const response = await fetch(`${NETSHORT_BASE_URL}${path}`, {
    cache: "no-store",
    headers: buildHeaders(),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `upstream=${path} status=${response.status} body=${body.slice(0,300)}`
    );
  }

  return response.json();
}

export function toErrorResponse(error: unknown, fallbackMessage: string) {
  const message =
    error instanceof Error && error.message
      ? error.message
      : fallbackMessage;

  return NextResponse.json({ error: message }, { status: 502 });
}

export function dedupeDramas(items: Drama[]): Drama[] {
  const map = new Map<number, Drama>();

  for (const item of items) {
    map.set(item.id, item);
  }

  return Array.from(map.values());
}

export function normalize(payload: unknown, variant: any) {
  return normalizeNetshortFeed(payload, variant, NETSHORT_SOURCE_ID);
}
