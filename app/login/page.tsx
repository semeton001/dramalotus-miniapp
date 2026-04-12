import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/me");
  }

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <h1 style={{ marginBottom: 12 }}>Login</h1>
      <p style={{ marginBottom: 20, opacity: 0.8 }}>
        Masuk ke website menggunakan identitas Telegram Anda.
      </p>

      <div
        dangerouslySetInnerHTML={{
          __html: `
            <script async src="https://telegram.org/js/telegram-widget.js?22"
              data-telegram-login="dramalotusviewer_bot"
              data-size="large"
              data-radius="8"
              data-request-access="write"
              data-userpic="false"
              data-auth-url="/api/auth/telegram">
            </script>
          `,
        }}
      />
    </main>
  );
}