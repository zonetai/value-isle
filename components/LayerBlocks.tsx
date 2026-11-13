import Link from "next/link";
import { DAILY } from "@/data/daily";
import { layerOf, md } from "@/lib/site";
import { G } from "./Gloss";
import { Icon } from "./Icon";

/** 出處連結：有網址就開新分頁，附 ↗ */
export function SrcLink({ src, url }: { src?: string; url?: string }) {
  if (!url) return <>{src ?? ""}</>;
  return <a href={url} target="_blank" rel="noopener">{src} ↗</a>;
}

/** 頁首底部的波浪收邊 */
const wavePath = (y: number, a: number) => `M0 ${y}q60 ${-a} 120 0${"t120 0".repeat(13)}V46H0z`;
export function HeroWave() {
  return (
    <svg className="ph-wave" viewBox="0 0 1440 46" preserveAspectRatio="none" aria-hidden="true">
      <path d={wavePath(19, 13)} fill="currentColor" opacity=".13" />
      <path d={wavePath(28, 10)} fill="#fbf7f1" />
    </svg>
  );
}

/** 頁首：標題、說明、屬於第幾層；mark 是右側淡淡的層次浮水印圖示，extra 放在說明下面（例如季節選擇器） */
export function PageHero({ title, children, badge, color, mark, extra }: { title: string; children: React.ReactNode; badge?: string; color?: string; mark?: string; extra?: React.ReactNode }) {
  return (
    <section className="page-hero">
      <div className="container">
        <h1>{title}</h1>
        <p><G>{children}</G></p>
        {badge && <div className="layer-badge" style={{ "--c": color } as React.CSSProperties}><i />{badge}</div>}
        {extra}
      </div>
      {mark && <span className="ph-mark" aria-hidden="true"><Icon name={mark} /></span>}
      <HeroWave />
    </section>
  );
}

/** 各層頁面上方的「最新動態」：每日觀測裡屬於這一層的專題與快訊 */
export function LayerDaily({ layer, title, desc, n = 4 }: { layer: string; title?: string; desc?: string; n?: number }) {
  const L = layerOf(layer);
  const items = DAILY.briefs.filter((b) => b.layer === layer).slice(0, n);
  const topics = DAILY.topics.filter((t) => t.layer === layer);
  if (!items.length && !topics.length) return null;
  return (
    <div className="layer-daily" id="layerDaily" style={{ "--c": L.hex } as React.CSSProperties}>
      <div className="ld-head">
        <div>
          <span className="kicker"><i className="ld-live" />最新動態 · 更新至 {DAILY.updated}</span>
          <h2>{title ?? L.name + "的最新動態"}</h2>
          <p>{desc ?? "每天早上自動整理，每則附出處與對估價的影響。"}</p>
        </div>
        <Link className="btn ghost sm" href={`/daily#layer-${layer}`}>看這一層全部動態</Link>
      </div>
      {topics.map((t) => (
        <Link className="card ld-topic" key={t.id} href={`/daily#${t.id}`}>
          <span className={`tag ${L.cls}`}>專題</span>
          <div><b>{t.title}</b><small>{t.status}</small><p><G>{t.summary}</G></p></div>
          <span className="go">看專題</span>
        </Link>
      ))}
      <div className="ld-grid">
        {items.map((b, i) => (
          <article className="card ld-item" key={b.url + b.t} style={{ animationDelay: `${i * 60}ms` }}>
            <div className="meta"><span className="date">{md(b.d)}</span>{b.tag && <span className="tag">{b.tag}</span>}</div>
            <h3>{b.t}</h3>
            <p><G>{b.s}</G></p>
            {b.i && <div className="impact"><G>{b.i}</G></div>}
            <div className="src"><SrcLink src={b.src} url={b.url} /></div>
          </article>
        ))}
      </div>
    </div>
  );
}

/** 「這一層的觀測項目」卡片 */
export function LayerItems({ layer }: { layer: string }) {
  return (
    <div className="intl-grid" id="items">
      {layerOf(layer).items.map((i) => (
        <div className="card intl-card reveal" key={i.t}>
          <h3>{i.t}</h3>
          <p><G>{i.s}</G></p>
          <div className="path"><span><G>{i.i}</G></span></div>
        </div>
      ))}
    </div>
  );
}
