import { requireVip } from "@/lib/auth/requireVip";

export default async function VipPage() {
  const user = await requireVip();

  const fullName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    (user.telegram_username ? `@${user.telegram_username}` : "User");

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <h1 style={{ marginBottom: 16 }}>VIP Page</h1>
      <p style={{ marginBottom: 20 }}>
        Halaman ini hanya bisa diakses oleh user dengan membership VIP.
      </p>

      <section
        style={{
          border: "1px solid #333",
          borderRadius: 12,
          padding: 20,
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 4 }}>User</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{fullName}</div>
        </div>

        <div>
          <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 4 }}>
            Membership
          </div>
          <span
            style={{
              display: "inline-block",
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #444",
              fontWeight: 700,
            }}
          >
            VIP
          </span>
        </div>
      </section>
    </main>
  );
}
