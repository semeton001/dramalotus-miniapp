import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import AppHeader from "./components/AppHeader";
import ClientDeterrent from "@/components/ClientDeterrent";

export const metadata: Metadata = {
  metadataBase: new URL("https://dramalotus.site"),
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
      <head>
        <meta
          httpEquiv="Delegate-CH"
          content="Sec-CH-UA https://s.pemsrv.com; Sec-CH-UA-Mobile https://s.pemsrv.com; Sec-CH-UA-Arch https://s.pemsrv.com; Sec-CH-UA-Model https://s.pemsrv.com; Sec-CH-UA-Platform https://s.pemsrv.com; Sec-CH-UA-Platform-Version https://s.pemsrv.com; Sec-CH-UA-Bitness https://s.pemsrv.com; Sec-CH-UA-Full-Version-List https://s.pemsrv.com; Sec-CH-UA-Full-Version https://s.pemsrv.com;"
        />
        <meta name="admaven-placement" content="Bqjs4qjk9" />
        <meta name="monetag" content="4e167066a81d007974931624f028c4fd" />
        <meta name="clckd" content="f7324e8fe2fd6e6555155860b50bb354" />
        <Script
          async
          src="https://libtl.com/sdk.js"
          data-zone="11011172"
          data-sdk="show_11011172"
          strategy="afterInteractive"
        />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5509759481478212"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />


      </head>
      <body>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="afterInteractive"
        />
        <ClientDeterrent />
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
