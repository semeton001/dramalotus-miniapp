import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import AppHeader from "./components/AppHeader";
import ClientDeterrent from "@/components/ClientDeterrent";

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
        <Script
          id="adsense-script"
          async
          strategy="afterInteractive"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5509759481478212"
          crossOrigin="anonymous"
        />
        <ClientDeterrent />
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
