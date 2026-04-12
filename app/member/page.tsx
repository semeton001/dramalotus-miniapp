import { requireUser } from "@/lib/auth/requireUser";

export default async function MemberPage() {
  const user = await requireUser();

  const fullName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    (user.telegram_username ? `@${user.telegram_username}` : "User");

  return (
    <main style={{ padding: 24, maxWidth: 800 }}>
      <h1 style={{ marginBottom: 12 }}>Member Area</h1>
      <p style={{ marginBottom: 20, opacity: 0.8 }}>
        Halaman ini hanya bisa dibuka oleh user yang sudah login.
      </p>

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
            Current User
          </div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{fullName}</div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 4 }}>
            Access Level
          </div>
          <div>Logged-in member</div>
        </div>

        <div>
          <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 4 }}>
            Membership Status
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
            {user.membership_status === "vip" ? "VIP" : "FREE"}
          </span>
        </div>
      </section>

      <section
        style={{
          border: "1px solid #333",
          borderRadius: 12,
          padding: 20,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 12 }}>Tujuan halaman ini</h2>
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
          <li>Contoh fitur web yang cukup butuh login.</li>
          <li>Reusable pattern untuk dashboard, riwayat tontonan, bookmark, dll.</li>
          <li>Semua akses diproteksi oleh requireUser().</li>
        </ul>
      </section>
    </main>
  );
}
