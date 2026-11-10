import Link from "next/link";
import { DAILY } from "@/data/daily";
import { layerOf, md } from "@/lib/site";

/** 出處連結：有網址就開新分頁，附 ↗ */
export function SrcLink({ src, url }: { src?: string; url?: string }) {
  if (!url) return <>{src ?? ""}</>;
  return <a href={url} target="_blank" rel="noopener">{src} ↗</a>;
}

/** 頁首：標題、說明、屬於第幾層 */
export function PageHero({ title, children, badge, color }: { title: string; children: React.ReactNode; badge?: string; color?: string }) {
  return (
    <section className="page-hero">
      <div className="container">
        <h1>{title}</h1>
        <p>{children}</p>
        {badge && <div className="layer-badge" style={{ "--c": color } as React.CSSProperties}><i />{badge}</div>}
      </div>
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
          <div><b>{t.title}</b><small>{t.status}</small><p>{t.summary}</p></div>
          <span className="go">看專題</span>
        </Link>
      ))}
      <div className="ld-grid">
        {items.map((b, i) => (
          <article className="card ld-item" key={b.url + b.t} style={{ animationDelay: `${i * 60}ms` }}>
            <div className="meta"><span className="date">{md(b.d)}</span>{b.tag && <span className="tag">{b.tag}</span>}</div>
            <h3>{b.t}</h3>
            <p>{b.s}</p>
            {b.i && <div className="impact">{b.i}</div>}
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
          <p>{i.s}</p>
          <div className="path"><span>{i.i}</span></div>
        </div>
      ))}
    </div>
  );
}
