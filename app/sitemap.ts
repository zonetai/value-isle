import type { MetadataRoute } from "next";
import { DATA } from "@/data/site";
import { DAILY } from "@/data/daily";
import { SITE_URL } from "@/lib/site";

/** /value-isle/sitemap.xml：站內各頁的正式網址（官網 zonetai.com） */
export default function sitemap(): MetadataRoute.Sitemap {
  return DATA.pages.map((p) => ({
    url: SITE_URL + (p.href === "/" ? "" : p.href),
    lastModified: p.href === "/daily" || p.href === "/" ? DAILY.updated : DATA.asOf,
    changeFrequency: p.href === "/daily" ? "daily" : "weekly",
    priority: p.href === "/" ? 1 : p.href === "/daily" ? 0.9 : 0.7,
  }));
}
