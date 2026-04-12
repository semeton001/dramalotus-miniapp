import { NextRequest } from "next/server";
import { respondDetail } from "../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim() ?? "";
  return respondDetail(id);
}
