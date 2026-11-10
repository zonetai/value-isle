"use client";

import { useEffect, useState } from "react";
import { DATA } from "@/data/site";
import { DAILY } from "@/data/daily";
import { fmtDate, layerOf } from "@/lib/site";
import type { Topic } from "@/data/daily-types";
import { SrcLink } from "./LayerBlocks";

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
  const tabs = [{ id: "briefs", t: "每日快訊" }, ...DAILY.topics.map((t) => ({ id: t.id, t: "專題：" + t.title }))];
  const list = DAILY.briefs.filter((b) => cat === "全部" || b.layer === cat);
  const days = [...new Set(list.map((b) => b.d))];

  return (
    <>
      <div className="daily-tabs" id="tabs">
        {tabs.map((t) => <button key={t.id} className={t.id === view ? "on" : undefined} onClick={() => go(t.id)}>{t.t}</button>)}
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
                    <p>{b.s}</p>
                    {b.i && <div className="impact">{b.i}</div>}
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
        <p>{t.summary}</p>
      </div>
      {groups?.map((g) => (
        <div className="tgroup" key={g.name}>
          <h3>{g.name}</h3>
          <div className="tgrid">
            {g.items.map((it) => (
              <div className="card titem" key={it.t}><b>{it.t}</b><p>{it.s}</p><div className="src"><SrcLink src={it.src} url={it.url} /></div></div>
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
                    <div className="say">{p.say}</div>
                    <div className="src"><SrcLink src={p.src} url={p.url} />{p.date ? `　${p.date}` : ""}</div>
                  </div>
                ))}
              </div>
              {th.note && <div className="tnote">{th.note}</div>}
              {th.i && <div className="impact">{th.i}</div>}
            </details>
          ))}
        </div>
      )}
      <div className="two-col" style={{ marginTop: 22 }}>
        <div className="card"><span className="kicker">估價師怎麼讀</span><p style={{ margin: "8px 0 0", fontSize: ".95rem", color: "var(--ink-2)" }}>{t.appraiser}</p></div>
        <div className="card"><span className="kicker">接下來看什麼</span><div className="bullets" style={{ marginTop: 10 }}>{(t.watch ?? []).map((w) => <div key={w}>{w}</div>)}</div></div>
      </div>
    </div>
  );
}
