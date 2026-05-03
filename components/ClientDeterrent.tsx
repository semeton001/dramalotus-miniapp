"use client";

import { useEffect, useRef } from "react";

const DEVTOOLS_THRESHOLD = 170;

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

  if (widthDiff > DEVTOOLS_THRESHOLD || heightDiff > DEVTOOLS_THRESHOLD) {
    return true;
  }

  const start = performance.now();
  // Deterrent timing check. DevTools can slow this path when debugging is active.
  // eslint-disable-next-line no-debugger
  debugger;
  const elapsed = performance.now() - start;

  return elapsed > 100;
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
      trigger();
    };

    const interval = window.setInterval(() => {
      if (isDevToolsLikelyOpen()) {
        trigger();
      }
    }, 1000);

    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  return null;
}
