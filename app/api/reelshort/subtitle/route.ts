import { NextRequest } from "next/server";
import { respondSubtitle } from "../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  return respondSubtitle(request);
}
