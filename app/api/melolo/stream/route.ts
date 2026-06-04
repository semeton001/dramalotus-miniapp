import { NextRequest } from "next/server";
import { respondStream } from "../_shared";

export async function GET(request: NextRequest) {
  return respondStream(request);
}
