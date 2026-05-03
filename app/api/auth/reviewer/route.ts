import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      code: "REVIEWER_LOGIN_DISABLED",
      error: "Login reviewer iPaymu sudah dinonaktifkan.",
    },
    { status: 403 },
  );
}
