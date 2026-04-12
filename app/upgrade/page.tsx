import Link from "next/link";
import { requireUser } from "@/lib/auth/requireUser";
import { FREE_EPISODE_LIMIT } from "@/lib/episodes/access";
import UpgradeVipClient from "./UpgradeVipClient";

type SearchParams = Promise<{
  from?: string;
  status?: string;
}>;

const PACKAGES = [
  { code: "VIP1", days: 1, label: "1 Hari", price: 2000 },
  { code: "VIP3", days: 3, label: "3 Hari", price: 5500 },
  { code: "VIP7", days: 7, label: "7 Hari", price: 10900 },
  { code: "VIP15", days: 15, label: "15 Hari", price: 20900 },
  { code: "VIP30", days: 30, label: "30 Hari", price: 34900 },
  { code: "VIP90", days: 90, label: "90 Hari", price: 99000 },
] as const;

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

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
    <main style={{ padding: 24, maxWidth: 860, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 12 }}>Upgrade VIP</h1>
      <p style={{ marginBottom: 20, opacity: 0.8, lineHeight: 1.7 }}>
        Membership FREE hanya bisa mengakses episode 1-{FREE_EPISODE_LIMIT}. Upgrade ke VIP untuk membuka semua episode dan konten premium lainnya.
      </p>

      {status === "success" ? (
        <div
          style={{
            border: "1px solid #1f7a1f",
            background: "rgba(31,122,31,0.08)",
            borderRadius: 12,
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
            border: "1px solid #7a5a1f",
            background: "rgba(122,90,31,0.08)",
            borderRadius: 12,
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

      <section
        style={{
          border: "1px solid #333",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 4 }}>
            Membership Saat Ini
          </div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>
            {isVip ? "VIP" : "FREE"}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 4 }}>
            Trigger
          </div>
          <div>{from}</div>
        </div>
      </section>

      <section
        style={{
          border: "1px solid #333",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 12 }}>Benefit VIP</h2>
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>
          <li>Akses semua episode tanpa batas.</li>
          <li>Akses Premium Library.</li>
          <li>Siap dipakai juga untuk bonus scene VIP.</li>
        </ul>
      </section>

      <section
        style={{
          border: "1px solid #333",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 12 }}>Paket VIP</h2>

        {isVip ? (
          <div
            style={{
              border: "1px solid #1f7a1f",
              background: "rgba(31,122,31,0.08)",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              VIP aktif
            </div>
            <div style={{ opacity: 0.85 }}>
              Akun kamu sudah VIP. Semua episode dan konten premium sudah terbuka.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            {PACKAGES.map((pkg) => (
              <div
                key={pkg.code}
                style={{
                  border: "1px solid #333",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                  {pkg.label}
                </div>
                <div style={{ opacity: 0.8, marginBottom: 14 }}>
                  Akses VIP selama {pkg.days} hari.
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 14 }}>
                  {formatRupiah(pkg.price)}
                </div>
                <UpgradeVipClient packageCode={pkg.code} packageLabel={pkg.label} />
              </div>
            ))}
          </div>
        )}
      </section>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link
          href="/episodes"
          style={{
            display: "inline-block",
            textDecoration: "none",
            color: "inherit",
            border: "1px solid #444",
            borderRadius: 10,
            padding: "10px 14px",
          }}
        >
          Kembali ke Episodes
        </Link>

        <Link
          href="/me"
          style={{
            display: "inline-block",
            textDecoration: "none",
            color: "inherit",
            border: "1px solid #444",
            borderRadius: 10,
            padding: "10px 14px",
          }}
        >
          My Account
        </Link>
      </div>
    </main>
  );
}
