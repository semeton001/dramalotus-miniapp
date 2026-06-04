import { NextRequest } from "next/server";
import { respondDetail } from "../../_shared";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const fakeRequest = {
    nextUrl: {
      searchParams: new URLSearchParams({
        id,
      }),
    },
  } as NextRequest;

  return respondDetail(fakeRequest);
}
