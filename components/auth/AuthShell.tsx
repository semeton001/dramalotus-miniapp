"use client";

import { ReactNode } from "react";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function AuthShell({ title, subtitle, children }: Props) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background:
          "radial-gradient(circle at top right, rgba(212,175,55,0.15), transparent 35%), linear-gradient(180deg, #0b0b0f 0%, #14141b 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          borderRadius: 24,
          padding: 32,
          background: "rgba(20,20,27,0.88)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow:
            "0 20px 60px rgba(0,0,0,0.45), 0 0 40px rgba(212,175,55,0.08)",
          backdropFilter: "blur(14px)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: "#ffffff",
              marginBottom: 8,
              letterSpacing: "-0.03em",
            }}
          >
            DramaLotus
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            {title}
          </h1>

          <p
            style={{
              marginTop: 10,
              color: "rgba(255,255,255,0.65)",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            {subtitle}
          </p>
        </div>

        {children}
      </div>
    </main>
  );
}
