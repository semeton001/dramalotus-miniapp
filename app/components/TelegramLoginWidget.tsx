"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    onTelegramAuth?: (user: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
      auth_date: number;
      hash: string;
    }) => void;
  }
}

export default function TelegramLoginWidget() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    window.onTelegramAuth = async (user) => {
      const res = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(user),
      });

      if (res.ok) {
        window.location.href = "/me";
        return;
      }

      const data = await res.json().catch(() => null);
      alert(data?.error || "Login gagal");
    };

    if (!containerRef.current) return;

    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", "dramalotusviewer_bot");
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "8");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");

    containerRef.current.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
    };
  }, []);

  return <div ref={containerRef} />;
}
