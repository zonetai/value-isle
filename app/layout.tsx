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

export const viewport: Viewport = { themeColor: "#fbf7f1" };

/* 字型：內文用各平台內建的中文字（iPhone 蘋方、Windows 微軟正黑、Android 思源黑體），不另外下載；
   只下載標題用的霞鶩文楷（粗體）與數字用的 IBM Plex Mono。樣式表用腳本非同步載入，不擋住畫面。 */
const FONTS = "https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@700&family=IBM+Plex+Mono:wght@400;500&display=swap";

/* 內容安全政策：只允許本站的腳本與資源、Google Fonts 的字型；不允許外嵌物件、改寫 base、送出表單 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

/* 在畫面出來前套上這位訪客上次選的季節（天色跟著變），並拿掉 no-js */
const BOOT = `document.documentElement.classList.remove("no-js");try{var s=localStorage.getItem("vi-season");document.body.dataset.season=/^(spring|summer|autumn|winter)$/.test(s)?s:"spring"}catch(e){document.body.dataset.season="spring"}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" className="no-js" suppressHydrationWarning>
      <head>
        {/* 同一份內容只讓搜尋引擎收錄官網 zonetai.com/value-isle；GitHub Pages 的副本標為不收錄 */}
        <script dangerouslySetInnerHTML={{ __html: `if(/\\.github\\.io$/.test(location.hostname)){var m=document.createElement("meta");m.name="robots";m.content="noindex, follow";document.head.appendChild(m);}` }} />
        <meta httpEquiv="Content-Security-Policy" content={CSP} />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <script dangerouslySetInnerHTML={{ __html: `(function(){var l=document.createElement("link");l.rel="stylesheet";l.href=${JSON.stringify(FONTS)};document.head.appendChild(l)})()` }} />
        <noscript><link rel="stylesheet" href={FONTS} /></noscript>
      </head>
      <body data-season="spring" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
        <IconSprite />
        <a className="skip-link" href="#main">跳到主要內容</a>
        <SiteProvider>
          <Nav />
          <main id="main" tabIndex={-1}>{children}</main>
          <Footer />
        </SiteProvider>
        <Reveal />
        <GlossPop />
      </body>
    </html>
  );
}
