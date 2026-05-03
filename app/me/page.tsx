import Link from "next/link";
import { requireUser } from "@/lib/auth/requireUser";

export default async function MePage() {
  const user = await requireUser();

  const fullName =
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || "No name";
  const username = user.telegram_username ? `@${user.telegram_username}` : "-";
  const isVip = user.membership_status === "vip";

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
            Account
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
              <div
                style={{
                  width: 78,
                  height: 78,
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 30,
                  fontWeight: 800,
                  color: "#F6E7C5",
                  background:
                    "linear-gradient(135deg, rgba(201,164,92,0.18), rgba(183,110,121,0.15))",
                  border: "1px solid rgba(201,164,92,0.18)",
                  boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
                  flexShrink: 0,
                }}
              >
                {fullName.charAt(0).toUpperCase()}
              </div>

              <div style={{ minWidth: 220, flex: "1 1 320px" }}>
                <div style={{ fontSize: 13, color: "#8F887C", marginBottom: 8 }}>
                  Member Name
                </div>
                <div
                  style={{
                    fontSize: "clamp(28px, 4vw, 40px)",
                    fontWeight: 800,
                    lineHeight: 1.08,
                    overflowWrap: "anywhere",
                  }}
                >
                  {fullName}
                </div>
                <div style={{ marginTop: 12, opacity: 0.82, fontSize: 14 }}>
                  Kelola akun dan akses membership Anda di DRAMALOTUS.
                </div>
              </div>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 999,
                padding: "10px 16px",
                fontSize: 14,
                fontWeight: 800,
                color: isVip ? "#F5E3B6" : "#F2EEE6",
                border: isVip
                  ? "1px solid rgba(201,164,92,0.24)"
                  : "1px solid rgba(255,255,255,0.10)",
                background: isVip
                  ? "linear-gradient(135deg, rgba(201,164,92,0.16), rgba(183,110,121,0.14))"
                  : "rgba(255,255,255,0.03)",
                boxShadow: isVip ? "0 8px 18px rgba(201,164,92,0.10)" : "none",
              }}
            >
              {isVip ? "VIP ACTIVE" : "FREE PLAN"}
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 18,
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
            Telegram Username
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, overflowWrap: "anywhere" }}>
            {username}
          </div>
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
          <div style={{ fontSize: 13, color: "#8F887C", marginBottom: 10 }}>
            Telegram User ID
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, overflowWrap: "anywhere" }}>
            {user.telegram_user_id ?? "-"}
          </div>
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
          <div style={{ fontSize: 13, color: "#8F887C", marginBottom: 10 }}>
            Membership Status
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {isVip ? "VIP plan" : "FREE plan"}
          </div>
        </div>
      </section>

      <section
        style={{
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          padding: 20,
          background:
            "linear-gradient(180deg, rgba(18,19,26,0.98) 0%, rgba(12,13,19,0.98) 100%)",
        }}
      >
        <div
          style={{
            fontSize: 13,
            color: "#8F887C",
            marginBottom: 14,
            textTransform: "uppercase",
            letterSpacing: 1.2,
          }}
        >
          Account Actions
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {!isVip ? (
            <Link
              href="/upgrade"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                color: "#111318",
                border: "1px solid rgba(201,164,92,0.2)",
                background:
                  "linear-gradient(135deg, #E5C37A 0%, #C99859 100%)",
                borderRadius: 16,
                padding: "12px 16px",
                fontWeight: 800,
              }}
            >
              Upgrade VIP
            </Link>
          ) : (
            <Link
              href="/vip"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                color: "#F1E4BF",
                border: "1px solid rgba(201,164,92,0.16)",
                background: "rgba(255,255,255,0.03)",
                borderRadius: 16,
                padding: "12px 16px",
                fontWeight: 700,
              }}
            >
              Halaman VIP
            </Link>
          )}

          <Link
            href="/terms"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              color: "#F5F1E8",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              borderRadius: 16,
              padding: "12px 16px",
              fontWeight: 700,
            }}
          >
            Syarat & Ketentuan
          </Link>

          <form action="/api/logout" method="post" style={{ margin: 0 }}>
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                cursor: "pointer",
                color: "#F5F1E8",
                fontWeight: 700,
              }}
            >
              Logout
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
