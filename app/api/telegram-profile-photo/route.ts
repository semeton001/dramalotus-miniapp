import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

type TelegramPhotosResponse = {
  ok: boolean;
  result?: {
    total_count: number;
    photos: Array<
      Array<{
        file_id: string;
        file_unique_id: string;
        width: number;
        height: number;
        file_size?: number;
      }>
    >;
  };
  description?: string;
};

type TelegramFileResponse = {
  ok: boolean;
  result?: {
    file_id: string;
    file_unique_id: string;
    file_size?: number;
    file_path?: string;
  };
  description?: string;
};

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user?.telegram_user_id) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return NextResponse.json(
        { ok: false, error: "Missing TELEGRAM_BOT_TOKEN" },
        { status: 500 },
      );
    }

    const photosRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${user.telegram_user_id}&limit=1`,
      { cache: "no-store" },
    );

    if (!photosRes.ok) {
      return NextResponse.json(
        { ok: false, error: "Failed to fetch Telegram profile photos" },
        { status: 502 },
      );
    }

    const photosData = (await photosRes.json()) as TelegramPhotosResponse;
    const firstGroup = photosData.result?.photos?.[0] ?? [];
    const bestPhoto = firstGroup[firstGroup.length - 1];

    if (!photosData.ok || !bestPhoto?.file_id) {
      return NextResponse.json({ ok: true, photoUrl: null });
    }

    const fileRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${bestPhoto.file_id}`,
      { cache: "no-store" },
    );

    if (!fileRes.ok) {
      return NextResponse.json(
        { ok: false, error: "Failed to resolve Telegram profile photo file" },
        { status: 502 },
      );
    }

    const fileData = (await fileRes.json()) as TelegramFileResponse;
    const filePath = fileData.result?.file_path;

    if (!fileData.ok || !filePath) {
      return NextResponse.json({ ok: true, photoUrl: null });
    }

    const photoUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

    return NextResponse.json({
      ok: true,
      photoUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 },
    );
  }
}
