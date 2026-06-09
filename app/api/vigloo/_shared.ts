const VIGLOO_BASE_URL = (
  process.env.VIGLOO_BASE_URL ||
  "https://captain.sapimu.au/vigloo"
).replace(/\/+$/, "");

const VIGLOO_TOKEN = process.env.VIGLOO_TOKEN || "";

export function buildViglooApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${VIGLOO_BASE_URL}${normalized}`;
}

export function getViglooHeaders(): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${VIGLOO_TOKEN}`,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  };
}

export { VIGLOO_BASE_URL, VIGLOO_TOKEN };


export const VIGLOO_HEADERS: HeadersInit = {
  Accept: "application/json",
  Authorization: `Bearer ${VIGLOO_TOKEN}`,
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
};
