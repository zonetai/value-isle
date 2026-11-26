import { DATA } from "@/data/site";
import { DAILY } from "@/data/daily";

/** 網址前綴，要跟 next.config.ts 的 basePath 一致。<Link> 會自動加；一般 <a>、location.href 要自己加 */
export const BASE = "/value-isle";
export const withBase = (path: string) => (path.startsWith("/") ? BASE + (path === "/" ? "" : path) : path);
/** 正式網址（搜尋引擎收錄、分享用） */
export const SITE_URL = "https://zonetai.com" + BASE;

export type LayerId = "policy" | "intl" | "market" | "ind";
export type Layer = (typeof DATA.layers)[number];
export type { Brief } from "@/data/daily-types";
export type Season = keyof typeof DATA.seasons;

export const layerOf = (id: string): Layer => DATA.layers.find((l) => l.id === id) ?? DATA.layers[0];

/** 元/m² → 萬/坪（小數一位） */
export const toPing = (p: number) => Math.round((p * 3.3058) / 1000) / 10;
export const fmt = (n: number) => n.toLocaleString("zh-TW");
/** "2026-11-09" → "11/09" */
export const md = (d: string) => d.slice(5).replace("-", "/");
const WK = ["日", "一", "二", "三", "四", "五", "六"];
export const fmtDate = (d: string) => {
  const t = new Date(d + "T00:00:00");
  return `${t.getMonth() + 1} 月 ${t.getDate()} 日（${WK[t.getDay()]}）`;
};

/**
 * 每頁的 metadata：標題、說明、正式網址（canonical 一律指向 zonetai.com/value-isle，
 * 這樣 github.io 的副本不會跟官網搶搜尋排名）
 */
/** 分享到 LINE、Facebook 時的縮圖（public/og.jpg，1200×630）；網址相對於 metadataBase（zonetai.com/value-isle/） */
export const OG_IMAGE = { url: "og.jpg?v=20261127", width: 1200, height: 630, alt: "價值島：一塊地的價格，從四層看起" };

/** 蓋高樓遊戲的分享縮圖（public/og-tower.jpg） */
export const TOWER_OG = { url: "og-tower.jpg?v=20261127", width: 1200, height: 630, alt: "價值島小遊戲：蓋高樓，你能蓋多高？" };

export const pageMeta = (title: string | null, description: string, path: string, image = OG_IMAGE) => {
  const url = SITE_URL + (path === "/" ? "" : path);
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: url },
    openGraph: { url, title: title ? `${title}｜價值島` : "價值島｜中泰不動產智庫的市場觀測站", description, siteName: "價值島｜中泰不動產智庫", locale: "zh_TW", type: "website" as const, images: [image] },
    twitter: { card: "summary_large_image" as const, images: [image.url] },
  };
};

/** 頁尾的資料日期：取實價登錄整理日與每日觀測更新日較新的一個 */
export const dataAsOf = () => (DAILY.updated > DATA.asOf ? DAILY.updated : DATA.asOf);
