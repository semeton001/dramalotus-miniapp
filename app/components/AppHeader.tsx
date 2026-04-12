import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export default async function AppHeader() {
  const user = await getCurrentUser();

  const fullName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    (user?.telegram_username ? `@${user.telegram_username}` : "User");

  return (
    <header
      style={{
        padding: "14px 20px",
        borderBottom: "1px solid #222",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <Link
        href="/"
        style={{
          fontWeight: 800,
          textDecoration: "none",
          color: "inherit",
          letterSpacing: 0.3,
        }}
      >
        DRAMALOTUS
      </Link>

      {user ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <span style={{ fontSize: 14 }}>{fullName}</span>

          <span
            style={{
              display: "inline-block",
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid #444",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {user.membership_status === "vip" ? "VIP" : "FREE"}
          </span>

          <Link
            href="/episodes"
            style={{
              textDecoration: "none",
              color: "inherit",
              fontSize: 14,
            }}
          >
            Episodes
          </Link>

          <Link
            href="/member"
            style={{
              textDecoration: "none",
              color: "inherit",
              fontSize: 14,
            }}
          >
            Member
          </Link>

          {user.membership_status === "vip" ? (
            <Link
              href="/premium-library"
              style={{
                textDecoration: "none",
                color: "inherit",
                fontSize: 14,
              }}
            >
              Premium Library
            </Link>
          ) : (
            <Link
              href="/upgrade"
              style={{
                textDecoration: "none",
                color: "inherit",
                fontSize: 14,
              }}
            >
              Upgrade VIP
            </Link>
          )}

          <Link
            href="/me"
            style={{
              textDecoration: "none",
              color: "inherit",
              fontSize: 14,
            }}
          >
            My Account
          </Link>
        </div>
      ) : (
        <Link
          href="/login"
          style={{
            textDecoration: "none",
            color: "inherit",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Login
        </Link>
      )}
    </header>
  );
}
