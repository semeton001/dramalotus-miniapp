import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function GET(request: NextRequest) {
  const tmpBase = path.join(os.tmpdir(), `melolo-image-${randomUUID()}`);
  const inputPath = `${tmpBase}.heic`;
  const outputPath = `${tmpBase}.jpg`;

  try {
    const rawUrl = request.nextUrl.searchParams.get("url")?.trim() || "";

    if (!rawUrl) {
      return NextResponse.json(
        { error: "Parameter url wajib diisi." },
        { status: 400 },
      );
    }

    let targetUrl: URL;

    try {
      targetUrl = new URL(rawUrl);
    } catch {
      return NextResponse.json(
        { error: "URL gambar tidak valid." },
        { status: 400 },
      );
    }

    if (!/^https?:$/i.test(targetUrl.protocol)) {
      return NextResponse.json(
        { error: "URL gambar harus http atau https." },
        { status: 400 },
      );
    }

    const upstream = await fetch(targetUrl.toString(), {
      cache: "no-store",
      headers: {
        Accept: "image/heic,image/heif,image/*,*/*;q=0.8",
        "User-Agent": request.headers.get("user-agent") || "Mozilla/5.0",
      },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Gagal mengambil gambar Melolo. status=${upstream.status}` },
        { status: upstream.status },
      );
    }

    const input = Buffer.from(await upstream.arrayBuffer());
    await fs.writeFile(inputPath, input);

    await execFileAsync("heif-convert", ["-q", "82", inputPath, outputPath], {
      timeout: 15000,
    });

    const output = await fs.readFile(outputPath);

    return new NextResponse(new Uint8Array(output), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Melolo image proxy error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memproses gambar Melolo.",
      },
      { status: 500 },
    );
  } finally {
    await Promise.allSettled([fs.unlink(inputPath), fs.unlink(outputPath)]);
  }
}
