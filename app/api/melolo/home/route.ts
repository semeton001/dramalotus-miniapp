import { NextRequest } from "next/server";
import { respondFeed } from "../_shared";

export async function GET(request: NextRequest) {
  return respondFeed(request, "home");
}
