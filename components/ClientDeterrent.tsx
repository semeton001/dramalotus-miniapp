"use client";

import { useEffect, useRef } from "react";

const DEVTOOLS_THRESHOLD = 170;

function isMiniAppPath() {
  return window.location.pathname === "/tg" || window.location.pathname.startsWith("/tg/");
}

function isTelegramMiniApp() {
  const maybeWindow = window as Window & {
    Telegram?: {
      WebApp?: unknown;
    };
  };

  return Boolean(maybeWindow.Telegram?.WebApp);
}

function isMobileLike() {
  return /Android|iPhone|iPad|iPod|Mobile|Telegram/i.test(
    navigator.userAgent || "",
  );
}

function isBlockedShortcut(event: KeyboardEvent) {
  const key = event.key.toLowerCase();

  return (
    event.key === "F12" ||
    (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key)) ||
    (event.metaKey && event.altKey && ["i", "j", "c"].includes(key)) ||
    (event.ctrlKey && ["u", "s"].includes(key)) ||
    (event.metaKey && ["u", "s"].includes(key))
  );
}

function isDevToolsLikelyOpen() {
  const widthDiff = window.outerWidth - window.innerWidth;
  const heightDiff = window.outerHeight - window.innerHeight;

  return widthDiff > DEVTOOLS_THRESHOLD || heightDiff > DEVTOOLS_THRESHOLD;
}

function leaveSite() {
  try {
    document.querySelectorAll("video").forEach((video) => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    });
  } catch {
    // ignore
  }

  try {
    document.documentElement.innerHTML = "";
  } catch {
    // ignore
  }

  try {
    window.location.replace("about:blank");
  } catch {
    window.location.href = "about:blank";
  }
}

export default function ClientDeterrent() {
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    return;

    // Jangan aktifkan deterrent di Telegram MiniApp / route /tg.
    // Proteksi stream tetap dilakukan di backend API.
    if (isMiniAppPath() || isTelegramMiniApp()) {
      return;
    }

    const shouldRunAutoDevtoolsDetector = !isMobileLike();

    const trigger = () => {
      if (hasTriggeredRef.current) return;
      hasTriggeredRef.current = true;
      leaveSite();
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isBlockedShortcut(event)) return;

      event.preventDefault();
      event.stopPropagation();

      if (shouldRunAutoDevtoolsDetector) {
        trigger();
      }
    };

    const interval = shouldRunAutoDevtoolsDetector
      ? window.setInterval(() => {
          if (isDevToolsLikelyOpen()) {
            trigger();
          }
        }, 1000)
      : null;

    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      if (interval) {
        window.clearInterval(interval);
      }

      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  return null;
}
