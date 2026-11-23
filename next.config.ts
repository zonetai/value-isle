import type { NextConfig } from "next";

/**
 * 價值島部署在 GitHub Pages（repo zonetai/value-isle 的 Pages，網址 https://zonetai.github.io/value-isle/），
 * 官網 zonetai.com 再把 /value-isle/* 轉接過來。所以：
 * - output: "export"：建置時把每一頁匯出成靜態 HTML（out/ 資料夾），由 .github/workflows/pages.yml 發布到 GitHub Pages。
 * - basePath 是 /value-isle：跟 GitHub Pages 的專案網址路徑一致，官網轉接也不用改。改這個值要同步改 lib/site.ts 的 BASE。
 *
 * 匯出後每一頁是 daily.html、market.html…；GitHub Pages 會讓 /value-isle/daily 與 /value-isle/daily.html 都開到同一頁，
 * 所以舊網址不用轉址也能開。兩個姊妹站（public/far-payment、public/renewal-sandbox）原樣複製，資料夾網址會開它的 index.html。
 * 靜態匯出不支援 redirects、rewrites、headers，這裡不要加。
 */
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/value-isle",
};

export default nextConfig;
