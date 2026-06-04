import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Subtitle not supported for GoodShort" },
    { status: 404 },
  );
}

export async function HEAD() {
  return new NextResponse(null, { status: 404 });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
