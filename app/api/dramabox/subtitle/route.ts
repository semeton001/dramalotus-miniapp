import { NextRequest } from "next/server";

export async function GET(_request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: {
      "cache-control": "no-store",
    },
  });
}
