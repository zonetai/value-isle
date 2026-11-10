"use client";

import { Fragment, useState } from "react";
import { DATA } from "@/data/site";
import { KN } from "@/data/knowledge";
import { layerOf } from "@/lib/site";

/** 手記：年份、層次兩排篩選；點卡片展開三個重點。伺服器端先畫出全部文章（搜尋引擎看得到） */
export function NotesList() {
  const [cat, setCat] = useState("全部");
  const [yr, setYr] = useState("全部");
  const years = [...new Set(KN.articles.map((a) => a.date.slice(0, 4)))].sort().reverse();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const list = KN.articles
    .filter((a) => (cat === "全部" || a.layer === cat) && (yr === "全部" || a.date.startsWith(yr)))
    .sort((x, y) => y.date.localeCompare(x.date));
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <>
      <div className="note-filters" id="yearBar">
        {["全部", ...years].map((y) => (
          <button key={y} className={y === yr ? "chip on" : "chip"} onClick={() => setYr(y)}>
            {y === "全部" ? "全部年份" : y + " 年"}
            <small>{y === "全部" ? KN.articles.length : KN.articles.filter((a) => a.date.startsWith(y)).length}</small>
          </button>
        ))}
      </div>
      <div className="note-filters" id="filters">
        {["全部", ...DATA.layers.map((l) => l.id)].map((c) => (
          <button key={c} className={c === cat ? "chip on" : "chip"} onClick={() => setCat(c)}>
            {c === "全部" ? "全部" : <><span className="dot" style={{ color: layerOf(c).hex }} />{layerOf(c).name}</>}
          </button>
        ))}
      </div>
      <div className="notes-grid" id="notes">
        {list.length === 0 && <div className="card">這個條件下沒有文章。</div>}
        {list.map((a, i) => {
          const y = a.date.slice(0, 4);
          const head = i === 0 || list[i - 1].date.slice(0, 4) !== y;
          const L = layerOf(a.layer);
          return (
            <Fragment key={a.id}>
              {head && <div className="year-head"><b>{y}</b><span>{list.filter((x) => x.date.startsWith(y)).length} 篇</span></div>}
              <article
                className={open.has(a.id) ? "card note-card open" : "card note-card"}
                style={{ "--c": L.hex, animation: `popin .4s ease ${Math.min(i, 8) * 60}ms both` } as React.CSSProperties}
                onClick={() => toggle(a.id)}
              >
                <div className="meta"><span className={`tag ${L.cls}`}>{L.name}</span><span>{a.date}</span><span>{a.venue}</span></div>
                <h3>{a.title}</h3>
                <div className="quote">{a.quote}</div>
                <p>{a.summary}</p>
                <div className="takes">{a.takeaways.map((t) => <span key={t}>{t}</span>)}</div>
                <div className="aud">適合：{a.audience}　<span style={{ color: "var(--c)" }}>{open.has(a.id) ? "收起重點 ‹" : "點卡片展開重點 ›"}</span></div>
              </article>
            </Fragment>
          );
        })}
      </div>
    </>
  );
}
