import { NextResponse } from "next/server";

export const DRAMAWAVE_BASE_URL =
  process.env.DRAMAWAVE_BASE_URL?.trim() ||
  "https://captain.sapimu.au/dramawave";

export const DRAMAWAVE_TOKEN =
  process.env.DRAMAWAVE_TOKEN?.trim() || "";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export function dramawaveHeaders() {
  return {
    Accept: "application/json, text/plain, */*",
    Authorization: `Bearer ${DRAMAWAVE_TOKEN}`,
    "User-Agent": UA,
  };
}

export async function fetchJson(path: string) {
  const res = await fetch(`${DRAMAWAVE_BASE_URL}${path}`, {
    method: "GET",
    cache: "no-store",
    headers: dramawaveHeaders(),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Dramawave upstream failed ${res.status}: ${text.slice(0, 300)}`);
  }

  if (!text.trim()) {
    throw new Error("Empty Dramawave response");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid Dramawave JSON: ${text.slice(0, 300)}`);
  }
}

export function errorJson(error: unknown, status = 500) {
  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Unknown Dramawave error",
    },
    { status },
  );
}
