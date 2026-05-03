import Link from "next/link";
import { requireVip } from "@/lib/auth/requireVip";

export default async function VipPage() {
  const user = await requireVip();

  const fullName =
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
    (user.telegram_username ? `@${user.telegram_username}` : "User");

  return (
    <main
      style={{
        padding: "20px 14px 28px",
        maxWidth: 1120,
        margin: "0 auto",
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 18% 12%, rgba(201,164,92,0.14), transparent 22%), radial-gradient(circle at 82% 18%, rgba(183,110,121,0.10), transparent 20%), linear-gradient(180deg, #090B12 0%, #0B0D14 38%, #090B12 100%)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontSize: "clamp(26px, 4vw, 42px)",
            fontWeight: 900,
            letterSpacing: 0.6,
            color: "#F6E7C5",
          }}
        >
          DRAMALOTUS
        </div>

        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            textDecoration: "none",
            color: "#111318",
            border: "1px solid rgba(201,164,92,0.20)",
            background: "linear-gradient(135deg, #E5C37A 0%, #C99859 100%)",
            borderRadius: 14,
            padding: "10px 14px",
            fontWeight: 800,
            whiteSpace: "nowrap",
            boxShadow: "0 10px 22px rgba(201,164,92,0.14)",
          }}
        >
          Beranda
        </Link>
      </div>

      <section
        style={{
          border: "1px solid rgba(201,164,92,0.14)",
          borderRadius: 28,
          padding: "24px 20px",
          marginBottom: 18,
          background:
            "linear-gradient(180deg, rgba(21,22,30,0.99) 0%, rgba(12,13,19,0.995) 100%)",
          boxShadow: "0 20px 48px rgba(0,0,0,0.26)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at top right, rgba(229,195,122,0.10), transparent 28%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative" }}>
          <div
            style={{
              fontSize: 12,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#8F887C",
              marginBottom: 10,
            }}
          >
            VIP Access
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <div style={{ maxWidth: 760 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(30px, 4.5vw, 46px)",
                  lineHeight: 1.08,
                  letterSpacing: 0.3,
                }}
              >
                Welcome to the
                <br />
                VIP Experience
              </h1>

              <p
                style={{
                  marginTop: 14,
                  marginBottom: 0,
                  opacity: 0.82,
                  lineHeight: 1.75,
                  maxWidth: 680,
                  fontSize: 15,
                }}
              >
                Halaman ini khusus untuk member VIP DRAMALOTUS. Semua akses premium
                terbuka untuk pengalaman menonton yang lebih lengkap, lebih nyaman,
                dan lebih eksklusif.
              </p>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 999,
                padding: "10px 16px",
                fontSize: 14,
                fontWeight: 800,
                color: "#F5E3B6",
                border: "1px solid rgba(201,164,92,0.24)",
                background:
                  "linear-gradient(135deg, rgba(201,164,92,0.16), rgba(183,110,121,0.14))",
                boxShadow: "0 8px 18px rgba(201,164,92,0.10)",
              }}
            >
              VIP MEMBER
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 24,
            padding: 22,
            background:
              "linear-gradient(180deg, rgba(18,19,26,0.96) 0%, rgba(12,13,19,0.98) 100%)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
          }}
        >
          <div style={{ fontSize: 13, color: "#8F887C", marginBottom: 10 }}>
            Member Name
          </div>
          <div
            style={{
              fontSize: "clamp(24px, 3vw, 32px)",
              fontWeight: 800,
              lineHeight: 1.15,
              overflowWrap: "anywhere",
              marginBottom: 18,
            }}
          >
            {fullName}
          </div>

          <div style={{ fontSize: 13, color: "#8F887C", marginBottom: 8 }}>
            Membership Status
          </div>
          <span
            style={{
              display: "inline-block",
              padding: "8px 14px",
              borderRadius: 999,
              border: "1px solid rgba(201,164,92,0.24)",
              background:
                "linear-gradient(135deg, rgba(201,164,92,0.16), rgba(183,110,121,0.14))",
              fontWeight: 800,
              color: "#F5E3B6",
            }}
          >
            VIP ACTIVE
          </span>
        </div>

        <div
          style={{
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 24,
            padding: 22,
            background:
              "linear-gradient(180deg, rgba(18,19,26,0.96) 0%, rgba(12,13,19,0.98) 100%)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
          }}
        >
          <div style={{ fontSize: 13, color: "#8F887C", marginBottom: 12 }}>
            VIP Benefits
          </div>

          <ul
            style={{
              margin: 0,
              paddingLeft: 0,
              listStyle: "none",
              lineHeight: 1.7,
              fontSize: 14,
              opacity: 0.92,
            }}
          >
            <li style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <span style={{ color: "#D9B36A", fontWeight: 700 }}>•</span>
              <span>Akses penuh ke konten premium tanpa batas.</span>
            </li>
            <li style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <span style={{ color: "#D9B36A", fontWeight: 700 }}>•</span>
              <span>Pengalaman menonton yang lebih eksklusif.</span>
            </li>
            <li style={{ display: "flex", gap: 10 }}>
              <span style={{ color: "#D9B36A", fontWeight: 700 }}>•</span>
              <span>Tampilan khusus untuk member VIP DRAMALOTUS.</span>
            </li>
          </ul>
        </div>
      </section>

      {false ? (
        <div style={{ marginTop: 20 }}>
          <Link
            href="/premium-library"
            style={{
              display: "inline-block",
              textDecoration: "none",
              color: "#111318",
              border: "1px solid rgba(201,164,92,0.2)",
              background:
                "linear-gradient(135deg, #E5C37A 0%, #C99859 100%)",
              borderRadius: 14,
              padding: "11px 15px",
              fontWeight: 800,
            }}
          >
            Buka Premium Library
          </Link>
        </div>
      ) : null}
    </main>
  );
}
