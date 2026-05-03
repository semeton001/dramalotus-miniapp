import Link from "next/link";
import { requireUser } from "@/lib/auth/requireUser";
import { FREE_EPISODE_LIMIT } from "@/lib/episodes/access";
import UpgradeVipClient from "./UpgradeVipClient";

type SearchParams = Promise<{
  from?: string;
  status?: string;
}>;

type VipPackage = {
  code: "VIP1" | "VIP3" | "VIP7" | "VIP15" | "VIP30" | "VIP90";
  days: number;
  label: string;
  price: number;
  featured?: boolean;
};

const PACKAGES: readonly (VipPackage & { bestValue?: boolean })[] = [
  { code: "VIP1", days: 1, label: "1 Hari", price: 2000 },
  { code: "VIP3", days: 3, label: "3 Hari", price: 5500, featured: true },
  { code: "VIP7", days: 7, label: "7 Hari", price: 10900 },
  { code: "VIP15", days: 15, label: "15 Hari", price: 20900 },
  { code: "VIP30", days: 30, label: "30 Hari", price: 34900 },
  { code: "VIP90", days: 90, label: "90 Hari", price: 99000, bestValue: true },
];

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const topCardsGrid =
  typeof window !== "undefined" && window.innerWidth < 768
    ? "1fr"
    : "minmax(220px, 0.78fr) minmax(360px, 1.22fr)";

const packageGrid =
  typeof window !== "undefined" && window.innerWidth < 768
    ? "repeat(3, minmax(0, 1fr))"
    : "repeat(auto-fit, minmax(220px, 1fr))";

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const resolvedSearchParams = await searchParams;
  const from = resolvedSearchParams.from ?? "locked-episode";
  const status = resolvedSearchParams.status ?? "";
  const isVip = user.membership_status === "vip";

  return (
    <main
      style={{
        padding: "16px 14px 20px",
        maxWidth: 1120,
        margin: "0 auto",
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 18% 12%, rgba(201,164,92,0.14), transparent 22%), radial-gradient(circle at 82% 18%, rgba(183,110,121,0.10), transparent 20%), linear-gradient(180deg, #090B12 0%, #0B0D14 38%, #090B12 100%)",
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, letterSpacing: 1.8, textTransform: "uppercase", color: "#8F887C", marginBottom: 8 }}>
          Membership Upgrade
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontSize: "clamp(26px, 3.4vw, 34px)", letterSpacing: 0.4 }}>UPGRADE VIP</h1>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 999,
              padding: "8px 14px",
              fontSize: 14,
              fontWeight: 800,
              color: isVip ? "#F5E3B6" : "#F5F1E8",
              border: isVip
                ? "1px solid rgba(201,164,92,0.24)"
                : "1px solid rgba(255,255,255,0.10)",
              background: isVip
                ? "linear-gradient(135deg,rgba(201,164,92,0.16),rgba(183,110,121,0.14))"
                : "rgba(255,255,255,0.03)",
            }}
          >
            {isVip ? "VIP" : "FREE"}
          </div>
        </div>
      </div>

      {status === "success" ? (
        <div
          style={{
            border: "1px solid rgba(64,176,96,0.35)",
            background: "rgba(31,122,31,0.10)",
            borderRadius: 18,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <strong>Pembayaran berhasil diproses.</strong>
          <div style={{ marginTop: 6, opacity: 0.85 }}>
            Status VIP akan otomatis ikut aktif setelah payment terverifikasi di server.
          </div>
        </div>
      ) : null}

      {status === "cancelled" ? (
        <div
          style={{
            border: "1px solid rgba(201,164,92,0.25)",
            background: "rgba(122,90,31,0.10)",
            borderRadius: 18,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <strong>Pembayaran dibatalkan atau belum selesai.</strong>
          <div style={{ marginTop: 6, opacity: 0.85 }}>
            Kamu bisa pilih paket lagi kapan saja.
          </div>
        </div>
      ) : null}

        {false ? (
          <div
            style={{
              border: "1px solid rgba(64,176,96,0.35)",
              background: "rgba(31,122,31,0.10)",
              borderRadius: 18,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <strong>Mode reviewer demo aktif.</strong>
            <div style={{ marginTop: 6, opacity: 0.85 }}>
              Akses checkout untuk verifikasi iPaymu berhasil diuji di mode demo.
            </div>
          </div>
        ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <section
          style={{
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 22,
            padding: 18,
            background:
              "linear-gradient(180deg, rgba(16,17,24,0.94) 0%, rgba(11,12,18,0.96) 100%)",
          }}
        >
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", lineHeight: 1.6, opacity: 0.92, fontSize: 14 }}>
            <li style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              <span style={{ color: "#D9B36A", fontWeight: 700 }}>•</span>
              <span>Akses semua episode tanpa batas.</span>
            </li>
            <li style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              <span style={{ color: "#D9B36A", fontWeight: 700 }}>•</span>
              <span>Konten premium tambahan.</span>
            </li>
            <li style={{ display: "flex", gap: 10 }}>
              <span style={{ color: "#D9B36A", fontWeight: 700 }}>•</span>
              <span>Pengalaman menonton lebih lengkap.</span>
            </li>
          </ul>
        </section>
      </div>

      <section
        style={{
          border: "1px solid rgba(201,164,92,0.14)",
          borderRadius: 24,
          padding: 22,
          marginBottom: 20,
          background:
            "linear-gradient(180deg, rgba(21,22,30,0.99) 0%, rgba(12,13,19,0.995) 100%)",
          boxShadow: "0 16px 42px rgba(0,0,0,0.22)",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 6, fontSize: 18, lineHeight: 1.25, fontWeight: 800, color: "#F6E7C5" }}>
          Paket VIP
        </h2>
        <div style={{ marginBottom: 12, opacity: 0.8, lineHeight: 1.6, fontSize: 14 }}>
          Pilih paket VIP yang paling cocok untuk kamu. Semakin lama durasi, semakin hemat.
        </div>
        <div
          style={{
            height: 1,
            marginBottom: 14,
            background: "linear-gradient(90deg, rgba(201,164,92,0.18), rgba(255,255,255,0.04), transparent)",
          }}
        />

        {isVip ? (
          <div
            style={{
              border: "1px solid rgba(64,176,96,0.35)",
              background: "rgba(31,122,31,0.10)",
              borderRadius: 18,
              padding: 18,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
              VIP aktif
            </div>
            <div style={{ opacity: 0.86 }}>
              Akun kamu sudah VIP. Semua episode dan konten premium sudah terbuka.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 14,
            }}
          >
            {PACKAGES.map((pkg) => (
              <div
                key={pkg.code}
                className="relative flex min-h-[126px] flex-col overflow-visible rounded-[14px] p-2.5 pt-3.5 md:min-h-[190px] md:rounded-[20px] md:p-[14px]"
                style={{
                  border: pkg.featured
                    ? "1.5px solid rgba(201,164,92,0.42)"
                    : pkg.bestValue
                      ? "1.5px solid rgba(201,164,92,0.32)"
                      : "1.5px solid rgba(255,255,255,0.18)",
                  background: pkg.featured
                    ? "linear-gradient(180deg, rgba(201,164,92,0.16) 0%, rgba(28,24,20,0.96) 16%, rgba(24,25,34,0.98) 72%)"
                    : pkg.bestValue
                      ? "linear-gradient(180deg, rgba(201,164,92,0.08) 0%, rgba(24,25,34,0.97) 26%, rgba(18,19,26,0.99) 100%)"
                      : "linear-gradient(180deg, rgba(28,29,38,0.98) 0%, rgba(19,20,28,0.99) 100%)",
                  boxShadow: pkg.featured
                    ? "0 20px 44px rgba(201,164,92,0.18)"
                    : pkg.bestValue
                      ? "0 16px 34px rgba(201,164,92,0.10)"
                      : "0 12px 28px rgba(0,0,0,0.18)",
                }}             >
                {pkg.featured ? (
                  <div
                    style={{
                      position: "absolute",
                      top: -10,
                      right: 2,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 52,
                      height: 22,
                      padding: "0 6px",
                      borderRadius: 999,
                      fontSize: 8,
                      fontWeight: 800,
                      background:
                        "linear-gradient(135deg, #E5C37A 0%, #C99859 100%)",
                      color: "#111318",
                    }}
                  >
                    POPULER
                  </div>
                ) : pkg.bestValue ? (
                  <div
                    style={{
                      position: "absolute",
                      top: -10,
                      right: 2,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 42,
                      height: 22,
                      padding: "0 6px",
                      borderRadius: 999,
                      fontSize: 8,
                      fontWeight: 800,
                      background:
                        "linear-gradient(135deg, #E5C37A 0%, #C99859 100%)",
                      border: "1px solid rgba(201,164,92,0.42)",
                      color: "#111318",
                    }}
                  >
                    HEMAT
                  </div>
                ) : null}

                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4, color: "#FFF7E8", lineHeight: 1.15, paddingRight: 0 }}>
                  {pkg.label}
                </div>
                <div style={{ opacity: 0.78, marginBottom: 3, lineHeight: 1.2, fontSize: 8 }}>
                  Akses VIP selama {pkg.days} hari.
                </div>
                <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 2, color: "#F8E7BF", letterSpacing: 0.08, lineHeight: 1.08 }}>
                  {formatRupiah(pkg.price)}
                </div>
                <div style={{ fontSize: 10, color: "#B7A98B", marginBottom: 6, opacity: 0.9, lineHeight: 1.12 }}>
                  ≈ {formatRupiah(Math.round(pkg.price / pkg.days))}/hari
                </div>
                <div style={{ marginTop: "auto", paddingTop: 8 }}>
                  <UpgradeVipClient packageCode={pkg.code} packageLabel={pkg.label} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
        <Link
          href="/"
          style={{
            display: "inline-block",
            textDecoration: "none",
            color: "#F5F1E8",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 12,
            padding: "10px 14px",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Kembali ke Beranda
        </Link>

        <Link
          href="/me"
          style={{
            display: "inline-block",
            textDecoration: "none",
            color: "#F5F1E8",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 12,
            padding: "10px 14px",
            fontWeight: 600,
          }}
        >
          My Account
        </Link>
      </div>
    </main>
  );
}
