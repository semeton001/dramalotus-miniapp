declare global {
  interface Window {
    googletag?: {
      cmd: Array<() => void>;
      apiReady?: boolean;
      pubads?: () => {
        enableSingleRequest: () => void;
        collapseEmptyDivs: () => void;
        disableInitialLoad: () => void;
        addEventListener: (
          eventName: "slotRenderEnded",
          callback: (event: {
            isEmpty: boolean;
            slot: {
              getSlotElementId: () => string;
            };
          }) => void,
        ) => void;
      };
      enableServices?: () => void;
      defineSlot?: (
        adUnitPath: string,
        size: [number, number] | Array<[number, number]>,
        divId: string,
      ) => {
        addService: (service: unknown) => unknown;
      } | null;
      display?: (divId: string) => void;
    };
  }
}

let gptLoadPromise: Promise<void> | null = null;

export function loadGptScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.googletag?.apiReady) {
    return Promise.resolve();
  }

  if (gptLoadPromise) {
    return gptLoadPromise;
  }

  gptLoadPromise = new Promise<void>((resolve, reject) => {
    window.googletag = window.googletag || { cmd: [] };

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-gpt="true"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Gagal memuat GPT script.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
    script.dataset.gpt = "true";

    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Gagal memuat GPT script."));

    document.head.appendChild(script);
  });

  return gptLoadPromise;
}
