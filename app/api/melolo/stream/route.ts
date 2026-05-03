import { NextRequest } from "next/server";
import { requireApiVip } from "@/lib/auth/requireApiVip";
import { respondStream } from "../_shared";

export async function GET(request: NextRequest) {
  const vipError = await requireApiVip();
  if (vipError) return vipError;

  return respondStream(request);
}
