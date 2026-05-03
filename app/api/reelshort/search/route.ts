import { NextRequest } from "next/server";
import { respondSearch } from "../_shared";

export const dynamic = "auto";
export const revalidate = 30;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
  return respondSearch(query);
}
