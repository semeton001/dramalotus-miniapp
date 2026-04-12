import { NextRequest } from "next/server";
import { respondStream } from "../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  return respondStream(request);
}
