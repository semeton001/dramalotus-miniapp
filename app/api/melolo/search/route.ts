import { NextRequest } from "next/server";
import { respondSearch } from "../_shared";

export async function GET(request: NextRequest) {
  return respondSearch(request);
}
