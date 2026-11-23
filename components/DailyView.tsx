"use client";

import { G } from "./Gloss";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DATA } from "@/data/site";
import { DAILY } from "@/data/daily";
import { fmtDate, layerOf } from "@/lib/site";
import type { Topic } from "@/data/daily-types";
import { SrcLink } from "./LayerBlocks";

/** 資料裡的站內連結可能還是舊寫法（notes.html#代號），換成新網址（/notes#代號） */
const siteHref = (u: string) => u.replace(/^\/?([a-z]+)\.html(?=#|$)/, (_, p: string) => (p === "index" ? "/" : "/" + p)).replace(/^(?!\/)/, "/");

/** 網址錨點：#briefs 快訊、#layer-intl 某一層的快訊、#us-midterm 某個專題 */
const readHash = () => {
  const h = location.hash.replace("#", "");
  if (h.startsWith("layer-")) return { view: "briefs", cat: h.slice(6) };
  return { view: DAILY.topics.some((t) => t.id === h) ? h : "briefs", cat: "全部" };
};

export function DailyView() {
  const [view, setView] = useState("briefs");
  const [cat, setCat] = useState("全部");

  useEffect(() => {
    const apply = () => { const s = readHash(); setView(s.view); setCat(s.cat); };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const go = (v: string, c = "全部") => {
    setView(v); setCat(c);
    history.replaceState(null, "", "#" + (v === "briefs" && c !== "全部" ? "layer-" + c : v));
  };
  /* 專題依議題新舊排列；設了 archived 的移到「較早的專題」 */
  const live = DAILY.topics.filter((t) => !t.archived), old = DAILY.topics.filter((t) => t.archived);
  const tabBtn = (id: string, label: string, isOld = false) => (
    <button key={id} className={[id === view ? "on" : "", isOld ? "old" : ""].filter(Boolean).join(" ") || undefined} onClick={() => go(id)}>{label}</button>
  );
  const list = DAILY.briefs.filter((b) => cat === "全部" || b.layer === cat);
  const days = [...new Set(list.map((b) => b.d))];

  return (
    <>
      <div className="daily-tabs" id="tabs">
        {tabBtn("briefs", "每日快訊")}
        {live.length > 0 && <span className="tabs-label">專題</span>}
        {live.map((t) => tabBtn(t.id, t.title))}
        {old.length > 0 && <span className="tabs-label">較早的專題</span>}
        {old.map((t) => tabBtn(t.id, t.title, true))}
      </div>

      <div id="view-briefs" hidden={view !== "briefs"}>
        <div className="note-filters" id="filters">
          {["全部", ...DATA.layers.map((l) => l.id)].map((c) => (
            <button key={c} className={c === cat ? "chip on" : "chip"} onClick={() => go("briefs", c)}>
              {c === "全部" ? "全部" : <><span className="dot" style={{ color: layerOf(c).hex }} />{layerOf(c).name}</>}
            </button>
          ))}
        </div>
        <div className="feed" id="feed">
          {days.length === 0 && <div className="card">這個分類目前沒有快訊。</div>}
          {days.map((d) => (
            <div className="day" key={d}>
              <div className="day-head"><b>{fmtDate(d)}</b><span>{d}</span></div>
              {list.filter((b) => b.d === d).map((b, i) => {
                const L = layerOf(b.layer);
                return (
                  <article className="card brief" key={b.url + b.t} style={{ "--c": L.hex, animationDelay: `${i * 50}ms` } as React.CSSProperties}>
                    <div className="meta"><span className={`tag ${L.cls}`}>{L.name}</span>{b.tag && <span className="tag">{b.tag}</span>}</div>
                    <h3>{b.t}</h3>
                    <p><G>{b.s}</G></p>
                    {b.i && <div className="impact"><G>{b.i}</G></div>}
                    <div className="src"><SrcLink src={b.src} url={b.url} /></div>
                  </article>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {DAILY.topics.map((t) => <TopicView key={t.id} t={t} hidden={view !== t.id} />)}
    </>
  );
}

function TopicView({ t, hidden }: { t: Topic; hidden: boolean }) {
  const L = layerOf(t.layer);
  const { groups, themes } = t;
  return (
    <div id={`topic-${t.id}`} hidden={hidden}>
      <div className="topic-head card" style={{ "--c": L.hex } as React.CSSProperties}>
        <div className="meta"><span className={`tag ${L.cls}`}>{L.name}</span><span className="mono">{t.date}</span></div>
        <h2>{t.title}</h2>
        <div className="status">{t.status}</div>
        <p><G>{t.summary}</G></p>
      </div>
      {groups?.map((g) => (
        <div className="tgroup" key={g.name}>
          <h3>{g.name}</h3>
          <div className="tgrid">
            {g.items.map((it) => (
              <div className="card titem" key={it.t}><b>{it.t}</b><p><G>{it.s}</G></p><div className="src"><SrcLink src={it.src} url={it.url} /></div></div>
            ))}
          </div>
        </div>
      ))}
      {themes && (
        <div className="themes">
          {themes.map((th, i) => (
            <details className="card theme" key={th.t} open={i === 0}>
              <summary><span className="n">{String(i + 1).padStart(2, "0")}</span><span><b>{th.t}</b><small>{th.s}</small></span></summary>
              <div className="pos">
                {th.positions.map((p) => (
                  <div className="p" key={p.who + p.say}>
                    <div className="who">{p.who}</div>
                    <div className="say"><G>{p.say}</G></div>
                    <div className="src"><SrcLink src={p.src} url={p.url} />{p.date ? `　${p.date}` : ""}</div>
                  </div>
                ))}
              </div>
              {th.note && <div className="tnote">{th.note}</div>}
              {th.i && <div className="impact"><G>{th.i}</G></div>}
            </details>
          ))}
        </div>
      )}
      {t.columns && t.columns.length > 0 && (
        <div className="tgroup tcols">
          <h3>專欄怎麼寫</h3>
          <div className="tgrid">
            {t.columns.map((c) => {
              const ext = /^https?:/.test(c.url);
              const inner = (
                <>
                  <span className="tcol-meta">{c.venue}{c.d ? "・" + c.d : ""}</span>
                  <b>{c.t}</b>
                  <p><G>{c.note ?? ""}</G></p>
                  <span className="tcol-go">{ext ? "讀全文" : "看重點摘要"}</span>
                </>
              );
              return ext
                ? <a key={c.url} className="card titem tcol" href={c.url} target="_blank" rel="noopener">{inner}</a>
                : <Link key={c.url} className="card titem tcol" href={siteHref(c.url)}>{inner}</Link>;
            })}
          </div>
        </div>
      )}
      <div className="two-col" style={{ marginTop: 22 }}>
        <div className="card"><span className="kicker">估價師怎麼讀</span><p style={{ margin: "8px 0 0", fontSize: ".95rem", color: "var(--ink-2)" }}><G>{t.appraiser}</G></p></div>
        <div className="card"><span className="kicker">接下來看什麼</span><div className="bullets" style={{ marginTop: 10 }}>{(t.watch ?? []).map((w) => <div key={w}><G>{w}</G></div>)}</div></div>
      </div>
    </div>
  );
}
