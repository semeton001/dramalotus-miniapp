import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import AppHeader from "./components/AppHeader";

export const metadata: Metadata = {
  title: "DRAMALOTUS",
  description: "Mini app drama pendek",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="afterInteractive"
        />
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
