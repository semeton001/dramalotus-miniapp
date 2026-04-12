"use client";

import { useState } from "react";

type Props = {
  packageCode: string;
  packageLabel: string;
};

type CheckoutResponse = {
  ok?: boolean;
  checkout_url?: string;
  payment_url?: string;
  invoice_url?: string;
  redirect_url?: string;
  detail?: string;
  error?: string;
};

export default function UpgradeVipClient({ packageCode, packageLabel }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleBuy() {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/upgrade/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          package_code: packageCode,
        }),
      });

      const data = (await response
        .json()
        .catch(() => ({}))) as CheckoutResponse;

      if (response.status === 401) {
        window.location.href = "/login?next=/upgrade";
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.detail || data.error || data.message || "Gagal membuat checkout",
        );
      }

      const checkoutUrl =
        data.checkout_url ||
        data.payment_url ||
        data.invoice_url ||
        data.redirect_url;

      if (!checkoutUrl) {
        throw new Error("checkout_url tidak ditemukan dari server");
      }

      window.location.href = checkoutUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(message);
      setLoading(false);
      return;
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleBuy}
        disabled={loading}
        style={{
          width: "100%",
          border: 0,
          borderRadius: 10,
          padding: "12px 14px",
          cursor: loading ? "not-allowed" : "pointer",
          fontWeight: 700,
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Memproses..." : `Beli ${packageLabel}`}
      </button>

      {error ? (
        <div
          style={{
            marginTop: 10,
            fontSize: 14,
            color: "#ff8080",
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
