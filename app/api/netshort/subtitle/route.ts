import { NextRequest, NextResponse } from "next/server";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";

function srtToVtt(srt: string): string {
  const normalized = srt
    .replace(/\r+/g, "")
    .replace(/^\d+\s*$/gm, "")
    .replace(
      /(\d{2}:\d{2}:\d{2}),(\d{3}) --> (\d{2}:\d{2}:\d{2}),(\d{3})/g,
      "$1.$2 --> $3.$4",
    );

  return `WEBVTT

STYLE
::cue {
  background: transparent;
}

${normalized}`;
}

function looksLikeSrt(text: string): boolean {
  return /^\s*\d+\s*$/m.test(text) && /-->/m.test(text);
}

function looksLikeVtt(text: string): boolean {
  return text.trimStart().startsWith("WEBVTT");
}

function isTlsCertError(error: unknown): boolean {
  const code =
    error &&
    typeof error === "object" &&
    "cause" in error &&
    error.cause &&
    typeof error.cause === "object" &&
    "code" in error.cause
      ? String((error.cause as { code?: unknown }).code)
      : "";

  return (
    code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
    code === "SELF_SIGNED_CERT_IN_CHAIN" ||
    code === "CERT_HAS_EXPIRED"
  );
}

async function fetchTextWithInsecureTls(
  url: string,
  redirectCount = 0,
): Promise<{
  status: number;
  headers: Record<string, string>;
  text: string;
}> {
  if (redirectCount > 5) {
    throw new Error("Too many redirects.");
  }

  const target = new URL(url);
  const isHttps = target.protocol === "https:";
  const client = isHttps ? httpsRequest : httpRequest;

  return await new Promise((resolve, reject) => {
    const req = client(
      target,
      {
        method: "GET",
        rejectUnauthorized: false,
        headers: {
          Accept: "*/*",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
        },
      },
      (res) => {
        const status = res.statusCode || 500;
        const location = res.headers.location;

        if (
          location &&
          [301, 302, 303, 307, 308].includes(status)
        ) {
          const nextUrl = new URL(location, target).toString();
          res.resume();
          fetchTextWithInsecureTls(nextUrl, redirectCount + 1)
            .then(resolve)
            .catch(reject);
          return;
        }

        const chunks: Buffer[] = [];

        res.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        res.on("end", () => {
          const headers: Record<string, string> = {};
          for (const [key, value] of Object.entries(res.headers)) {
            if (typeof value === "string") {
              headers[key.toLowerCase()] = value;
            } else if (Array.isArray(value)) {
              headers[key.toLowerCase()] = value.join(", ");
            }
          }

          resolve({
            status,
            headers,
            text: Buffer.concat(chunks).toString("utf8"),
          });
        });

        res.on("error", reject);
      },
    );

    req.on("error", reject);
    req.end();
  });
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")?.trim() ?? "";

  if (!url) {
    return NextResponse.json({ error: "url is required." }, { status: 400 });
  }

  try {
    let status = 200;
    let contentType = "";
    let rawText = "";

    try {
      const response = await fetch(url, {
        cache: "no-store",
        redirect: "follow",
        headers: {
          Accept: "*/*",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
        },
      });

      status = response.status;
      contentType = response.headers.get("content-type") || "";
      rawText = await response.text();
    } catch (error) {
      if (!isTlsCertError(error)) throw error;

      const fallback = await fetchTextWithInsecureTls(url);
      status = fallback.status;
      contentType = fallback.headers["content-type"] || "";
      rawText = fallback.text;
    }

    if (status < 200 || status >= 300) {
      return NextResponse.json(
        {
          error: `subtitle fetch failed: ${status}`,
          detail: rawText.slice(0, 300),
        },
        { status },
      );
    }

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        { error: "subtitle body is empty" },
        { status: 500 },
      );
    }

    let body = rawText;

    if (looksLikeVtt(rawText)) {
      body = rawText;
    } else if (
      looksLikeSrt(rawText) ||
      url.toLowerCase().includes(".srt") ||
      contentType.includes("text/plain")
    ) {
      body = srtToVtt(rawText);
    } else {
      body = `WEBVTT

STYLE
::cue {
  background: transparent;
}

${rawText}`;
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("NETSHORT_SUBTITLE_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load subtitle.",
      },
      { status: 500 },
    );
  }
}