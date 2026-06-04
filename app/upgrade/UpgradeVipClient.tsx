"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  qr_image?: string;
  expired_at?: string;
  invoice_id?: string;
  amount?: number;
  days?: number;
  detail?: string;
  error?: string;
  message?: string;
};

export default function UpgradeVipClient({ packageCode, packageLabel }: Props) {
  const [loading, setLoading] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [error, setError] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [expiredAt, setExpiredAt] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [copied, setCopied] = useState(false);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingRef = useRef(false);

  const expiredText = useMemo(() => {
    if (!expiredAt) return "";
    const d = new Date(expiredAt);
    if (Number.isNaN(d.getTime())) return expiredAt;
    return d.toLocaleString("id-ID");
  }, [expiredAt]);

  function stopPolling() {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    isPollingRef.current = false;
  }

  function stopCountdown() {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }

  function formatRemaining(ms: number) {
    if (ms <= 0) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function closeModal() {
    stopPolling();
    stopCountdown();
    setShowModal(false);
    setQrImage("");
    setPaymentUrl("");
    setInvoiceId("");
    setExpiredAt("");
    setTimeLeft("");
    setCopied(false);
    setError("");
    setLoading(false);
    setRechecking(false);
  }

  async function recheckPayment(options?: { silent?: boolean }) {
    if (!invoiceId) return;
    if (isPollingRef.current && !options?.silent) return;

    if (options?.silent) {
      isPollingRef.current = true;
    } else {
      setRechecking(true);
    }

    try {
      const response = await fetch("https://api.dramalotus.site/api/app/payment/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoice_id: invoiceId,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
        result?: {
          ok?: boolean;
          invoice_id?: string;
          result?: {
            normalized_status?: string;
            status?: string;
            message?: string;
          };
        };
      };

      if (response.status === 401) {
        window.location.href = "/login?next=/upgrade";
        return;
      }

      if (!response.ok) {
        if (!options?.silent) {
          throw new Error(data?.message || data?.error || "Gagal cek status pembayaran");
        }
        return;
      }

      const result = data?.result?.result || {};
      const normalizedStatus = String(
        result?.normalized_status || result?.status || ""
      ).toLowerCase();

      if (normalizedStatus === "paid") {
        stopPolling();
        stopCountdown();
        setShowModal(false);
        window.location.href = "/?tab=profile&payment=success";
        return;
      }

      if (normalizedStatus === "expired") {
        stopPolling();
        if (!options?.silent) {
          throw new Error("Transaksi sudah expired. Silakan buat transaksi baru.");
        }
        return;
      }

      if (normalizedStatus === "failed") {
        stopPolling();
        if (!options?.silent) {
          throw new Error("Transaksi gagal. Silakan buat transaksi baru.");
        }
        return;
      }

      if (!options?.silent) {
        throw new Error("Pembayaran belum terdeteksi. Coba lagi beberapa saat.");
      }
    } catch (err) {
      if (!options?.silent) {
        const message =
          err instanceof Error ? err.message : "Terjadi kesalahan saat cek pembayaran";
        setError(message);
      }
    } finally {
      if (options?.silent) {
        isPollingRef.current = false;
      } else {
        setRechecking(false);
      }
    }
  }

  async function handleCheckPaid() {
    setError("");
    await recheckPayment({ silent: false });
  }

  async function handleCopyInvoice() {
    if (!invoiceId) return;
    try {
      await navigator.clipboard.writeText(invoiceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Gagal menyalin invoice.");
    }
  }

  async function handleBuy() {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("https://api.dramalotus.site/api/app/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          package_code: packageCode,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as CheckoutResponse;

      if (response.status === 401) {
        window.location.href = "/login?next=/upgrade";
        return;
      }

      if (!response.ok) {
        throw new Error(data.detail || data.error || "Gagal membuat checkout");
      }

      const checkoutUrl =
        data.checkout_url ||
        data.payment_url ||
        data.invoice_url ||
        data.redirect_url ||
        "";

      const qrImageUrl = data.qr_image || "";

      if (qrImageUrl) {
        setQrImage(qrImageUrl);
        setPaymentUrl(checkoutUrl);
        setInvoiceId(data.invoice_id || "");
        setExpiredAt(data.expired_at || "");
        setShowModal(true);
        setLoading(false);
        return;
      }

      if (!checkoutUrl) {
        throw new Error("checkout_url tidak ditemukan dari server");
      }

      window.location.href = checkoutUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(message);
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!showModal || !invoiceId) {
      stopPolling();
      return;
    }

    stopPolling();

    pollTimerRef.current = setInterval(() => {
      void recheckPayment({ silent: true });
    }, 7000);

    return () => {
      stopPolling();
    };
  }, [showModal, invoiceId]);

  useEffect(() => {
    if (!showModal || !expiredAt) {
      stopCountdown();
      setTimeLeft("");
      return;
    }

    const target = new Date(expiredAt).getTime();
    if (Number.isNaN(target)) {
      setTimeLeft("");
      return;
    }

    const updateCountdown = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setTimeLeft("00:00");
        stopCountdown();
        return;
      }
      setTimeLeft(formatRemaining(diff));
    };

    updateCountdown();
    stopCountdown();
    countdownTimerRef.current = setInterval(updateCountdown, 1000);

    return () => {
      stopCountdown();
    };
  }, [showModal, expiredAt]);

  return (
    <div>
      <style>{`
        @keyframes dramalotus-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <button
        type="button"
        onClick={handleBuy}
        disabled={loading}
        className="w-full rounded-[8px] px-1.5 py-2 text-[9px] font-bold leading-none md:rounded-[10px] md:px-3 md:py-2.5 md:text-[14px]"
        style={{
          border: 0,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
          background: "linear-gradient(135deg, #E5C37A 0%, #C99859 100%)",
          color: "#111318",
          boxShadow: "0 8px 18px rgba(201,164,92,0.18)",
        }}
      >
        {loading ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              justifyContent: "center",
            }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                border: "2px solid rgba(17,19,24,0.25)",
                borderTopColor: "#111318",
                display: "inline-block",
                animation: "dramalotus-spin 0.8s linear infinite",
              }}
            />
            <span>Memproses...</span>
          </span>
        ) : "Beli"}
      </button>

      {showModal ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              borderRadius: 20,
              background: "#111318",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
              padding: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#F6E7C5" }}>
                  QRIS Payment
                </div>
                <div style={{ marginTop: 4, fontSize: 14, opacity: 0.82 }}>
                  {packageLabel}
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "8px 10px",
                  cursor: "pointer",
                }}
              >
                Tutup
              </button>
            </div>

            {invoiceId ? (
              <div
                style={{
                  marginBottom: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontSize: 13, opacity: 0.78 }}>
                  Invoice: <strong>{invoiceId}</strong>
                </div>

                <button
                  type="button"
                  onClick={handleCopyInvoice}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {copied ? "Tersalin" : "Copy Invoice"}
                </button>
              </div>
            ) : null}

            {expiredText ? (
              <div style={{ marginBottom: 8, fontSize: 13, opacity: 0.78 }}>
                Berlaku sampai: <strong>{expiredText}</strong>
              </div>
            ) : null}

            {timeLeft ? (
              <div
                style={{
                  marginBottom: 14,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(229,195,122,0.20)",
                  background: "rgba(229,195,122,0.08)",
                  color: "#F6E7C5",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                Sisa waktu pembayaran: {timeLeft}
              </div>
            ) : null}

            {error ? (
              <div
                style={{
                  marginBottom: 14,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,120,120,0.24)",
                  background: "rgba(180,50,50,0.12)",
                  color: "#ffb3b3",
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                {error}
              </div>
            ) : null}

            <div
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: 12,
                display: "flex",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <img
                src={qrImage}
                alt={`QRIS ${packageLabel}`}
                style={{
                  width: "100%",
                  maxWidth: 280,
                  height: "auto",
                  display: "block",
                }}
              />
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <button
                type="button"
                onClick={handleCheckPaid}
                disabled={rechecking}
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: rechecking ? "not-allowed" : "pointer",
                  opacity: rechecking ? 0.7 : 1,
                }}
              >
                {rechecking ? "Mengecek pembayaran..." : "Saya Sudah Bayar"}
              </button>

              <button
                type="button"
                onClick={closeModal}
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,120,120,0.24)",
                  background: "rgba(180,50,50,0.12)",
                  color: "#ffb3b3",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Batalkan Transaksi
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
