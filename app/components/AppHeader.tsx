import Link from "next/link";

export default async function AppHeader() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background:
          "linear-gradient(180deg, rgba(8,9,13,0.96) 0%, rgba(8,9,13,0.90) 100%)",
        backdropFilter: "blur(14px)",
      }}
    >
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
        }}
      >
        <Link
          href="/"
          style={{
            textDecoration: "none",
            color: "#F4E7C3",
            fontSize: 18,
            fontWeight: 900,
            letterSpacing: 0.6,
            whiteSpace: "nowrap",
          }}
        >
          DRAMALOTUS
        </Link>
      </div>
    </header>
  );
}
