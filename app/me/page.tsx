import { requireUser } from "@/lib/auth/requireUser";

export default async function MePage() {
  const user = await requireUser();

  const fullName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") || "No name";
  const username = user.telegram_username ? `@${user.telegram_username}` : "-";
  const membershipLabel = user.membership_status === "vip" ? "VIP" : "FREE";

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <h1 style={{ marginBottom: 24 }}>My Account</h1>

      <section
        style={{
          border: "1px solid #333",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 4 }}>Name</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{fullName}</div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 4 }}>
            Telegram Username
          </div>
          <div>{username}</div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 4 }}>
            Telegram User ID
          </div>
          <div>{user.telegram_user_id}</div>
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
            {membershipLabel}
          </span>
        </div>
      </section>

      <form action="/api/logout" method="post">
        <button
          type="submit"
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "1px solid #444",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </form>
    </main>
  );
}
