import type { Metadata, Viewport } from "next";
import { Footer } from "@/components/Footer";
import { GlossPop } from "@/components/GlossPop";
import { IconSprite } from "@/components/Icon";
import { Nav } from "@/components/Nav";
import { Reveal } from "@/components/Reveal";
import { SiteProvider } from "@/components/SiteProvider";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL + "/"),
  title: { default: "價值島｜中泰不動產智庫的市場觀測站", template: "%s｜價值島" },
  description: "一塊地的價格，從四層看起：國際海象、政策氣候、市場潮位、個別條件。中泰不動產智庫整理的互動式市場觀測站。",
  applicationName: "價值島",
  openGraph: { siteName: "價值島｜中泰不動產智庫", locale: "zh_TW", type: "website" },
};

export const viewport: Viewport = { themeColor: "#e4572e" };

/* 在畫面出來前套上這位訪客上次選的季節（天色跟著變），並拿掉 no-js */
const BOOT = `document.documentElement.classList.remove("no-js");try{var s=localStorage.getItem("vi-season");document.body.dataset.season=/^(spring|summer|autumn|winter)$/.test(s)?s:"spring"}catch(e){document.body.dataset.season="spring"}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" className="no-js" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&family=Noto+Serif+TC:wght@700;900&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body data-season="spring" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
        <IconSprite />
        <SiteProvider>
          <Nav />
          <main>{children}</main>
          <Footer />
        </SiteProvider>
        <Reveal />
        <GlossPop />
      </body>
    </html>
  );
}
