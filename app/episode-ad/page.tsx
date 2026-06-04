"use client";

import Script from "next/script";

export default function EpisodeAdPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#0b0b0b,#151515)",
        color: "#fff",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          textAlign: "center",
          background: "#111",
          borderRadius: "20px",
          padding: "20px",
          boxSizing: "border-box",
        }}
      >
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 800,
            marginBottom: "8px",
          }}
        >
          Sponsor Break
        </h1>

        <p
          style={{
            color: "#cfcfcf",
            fontSize: "15px",
            marginBottom: "18px",
          }}
        >
          Nikmati akses bebas iklan dengan DramaLotus VIP.
        </p>

        <button
          onClick={() => {
            window.parent.postMessage({ type: "OPEN_VIP" }, "*");
          }}
          style={{
            width: "100%",
            background: "#d4af37",
            color: "#000",
            padding: "14px",
            borderRadius: "12px",
            fontWeight: 800,
            border: "none",
            marginBottom: "20px",
          }}
        >
          👑 Upgrade VIP
        </button>

        <div
          style={{
            minHeight: "250px",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
            borderRadius: "12px",
            background: "#1a1a1a",
          }}
        >
          <Script
            id="adsterra-native"
            strategy="afterInteractive"
            src="https://pl29446384.effectivecpmnetwork.com/f1422f15b12b6a22d424cdb1909f6acc/invoke.js"
            async
          />
          <div id="container-f1422f15b12b6a22d424cdb1909f6acc" />
        </div>

        <div
          style={{
            minHeight: "100px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
            borderRadius: "12px",
            background: "#1a1a1a",
          }}
        >
          <Script
            id="exo-provider"
            strategy="afterInteractive"
            src="https://a.magsrv.com/ad-provider.js"
            async
          />
          <ins
            className="eas6a97888e10"
            data-zoneid="5929340"
            style={{
              display: "block",
              width: "320px",
              height: "100px",
            }}
          />
          <Script id="exo-init" strategy="afterInteractive">
            {`(AdProvider = window.AdProvider || []).push({"serve": {}});`}
          </Script>
        </div>
      </div>
    </main>
  );
}
