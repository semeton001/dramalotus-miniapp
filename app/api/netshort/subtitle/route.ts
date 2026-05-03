import { NextRequest, NextResponse } from "next/server";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";

const NETSHORT_EPISODE_BASE_URL =
  "https://streamapi.web.id/p/netshort/api/v1/episode";

const NETSHORT_TOKEN = process.env.NETSHORT_TOKEN?.trim() || "";

type StreamapiNetshortEpisodeResponse = {
  code?: number;
  data?: {
    subtitles?: Array<{
      language?: string;
      format?: string;
      url?: string;
    }>;
  };
};

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

function emptyVtt(): NextResponse {
  return new NextResponse("WEBVTT\n\n", {
    status: 200,
    headers: {
      "Content-Type": "text/vtt; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
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

async function resolveSubtitleUrl(
  dramaId: string,
  episodeNo: string,
): Promise<string> {
  const upstreamUrl = `${NETSHORT_EPISODE_BASE_URL}/${encodeURIComponent(
    dramaId,
  )}/${encodeURIComponent(episodeNo)}?lang=id_ID&token=${NETSHORT_TOKEN}`;

  const response = await fetch(upstreamUrl, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Netshort episode failed: ${response.status}`);
  }

  const payload = (await response.json()) as StreamapiNetshortEpisodeResponse;
  const subtitles = Array.isArray(payload.data?.subtitles)
    ? payload.data.subtitles
    : [];

  const subtitle =
    subtitles.find(
      (item) =>
        typeof item.language === "string" &&
        item.language.toLowerCase().startsWith("id") &&
        typeof item.url === "string" &&
        item.url.trim().length > 0,
    ) ||
    subtitles.find(
      (item) => typeof item.url === "string" && item.url.trim().length > 0,
    );

  const subtitleUrl = subtitle?.url?.trim() || "";

  if (!subtitleUrl) {
    throw new Error("Netshort subtitle URL not found.");
  }

  return subtitleUrl;
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

        if (location && [301, 302, 303, 307, 308].includes(status)) {
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
  const directUrl = request.nextUrl.searchParams.get("url")?.trim() ?? "";
  const dramaId = request.nextUrl.searchParams.get("dramaId")?.trim() ?? "";
  const episodeNo = request.nextUrl.searchParams.get("episodeNo")?.trim() ?? "";

  let url = directUrl;

  try {
    if (!url && dramaId && episodeNo) {
      url = await resolveSubtitleUrl(dramaId, episodeNo);
    }

    if (!url) {
      return NextResponse.json(
        { error: "url or dramaId+episodeNo is required." },
        { status: 400 },
      );
    }

    let status = 200;
    let contentType = "";
    let rawText = "";

    try {
      const response = await fetch(url, {
        cache: "no-store",
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
      if (!isTlsCertError(error)) {
        throw error;
      }

      const fallback = await fetchTextWithInsecureTls(url);
      status = fallback.status;
      contentType = fallback.headers["content-type"] || "";
      rawText = fallback.text;
    }

    if (status < 200 || status >= 300) {
      return new NextResponse(rawText || "Failed to load subtitle.", {
        status,
        headers: {
          "Content-Type": contentType || "text/plain; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const body = looksLikeVtt(rawText)
      ? rawText
      : looksLikeSrt(rawText)
        ? srtToVtt(rawText)
        : `WEBVTT

${rawText}`;

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "public, max-age=60, s-maxage=300",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.warn("NetShort subtitle gagal, return VTT kosong:", error);
    return emptyVtt();
  }
}
