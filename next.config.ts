import type { NextConfig } from "next";

/**
 * 價值島掛在官網 zonetai.com/value-isle 底下：官網（Zonetai_Brand-Website）把 /value-isle/* 轉接到這個 Vercel 專案，
 * 所以這裡的每一頁、每個靜態檔都要帶 /value-isle 前綴（basePath）。改這個值要同步改 lib/site.ts 的 BASE。
 */
const PAGES = ["daily", "weather", "market", "policy", "global", "notes", "roles", "drill", "about"];

const nextConfig: NextConfig = {
  basePath: "/value-isle",
  /** 舊版是靜態網頁（daily.html…），外面的連結與搜尋結果都還指向 .html，一律永久轉到新網址；#錨點由瀏覽器保留 */
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      ...PAGES.map((p) => ({ source: `/${p}.html`, destination: `/${p}`, permanent: true })),
    ];
  },
};

export default nextConfig;
