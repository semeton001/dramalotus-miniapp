import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const upstreamUrl = `https://dramawave.dramabos.my.id/api/drama/${encodeURIComponent(id)}?lang=in&code=4D96F22760EA30FB0FFBA9AA87A979A6`;

    const response = await fetch(upstreamUrl, { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Gagal memuat detail Dramawave. status=${response.status}` },
        { status: response.status },
      );
    }

    const payload = await response.json();
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat detail Dramawave.",
      },
      { status: 500 },
    );
  }
}
