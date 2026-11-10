"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

export type PolicyEvent = { when: string; cat: string; t: string; s: string; i: string; src?: string; url?: string; future?: boolean };

const CAT_COLOR: Record<string, string> = {
  信用管制: "var(--c-policy)", 稅制: "#b5452e", 交易限制: "#8a5a2b", 住宅政策: "var(--c-market)", 資訊透明: "var(--c-intl)",
  利率: "var(--c-intl)", 國際: "#2a6f97", 都更危老: "var(--c-ind)", 其他: "var(--ink-3)", 近期動態: "var(--accent)", 追蹤中: "var(--ink-3)",
};
const colorOf = (c: string) => CAT_COLOR[c] ?? "var(--ink)";

/**
 * 政策時間軸：畫面上最新在上；按播放會由最早一路亮到最新（被篩掉的不播）。
 * events 依時間由舊到新排好（伺服器端已把每日觀測的政策快訊接進來）。
 * 這裡的項目不掛 .reveal：播放時 React 會改它們的 class，會把捲動淡入加上的 in 洗掉。
 */
export function PolicyTimeline({ events }: { events: PolicyEvent[] }) {
  const [cat, setCat] = useState("全部");
  const [k, setK] = useState<number | null>(null); // null＝全部顯示；數字＝播到第幾個（由舊到新）
  const [playing, setPlaying] = useState(false);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  const cats = ["全部", ...new Set(events.map((p) => p.cat))];
  const visible = events.map((p, i) => ({ p, i })).filter(({ p }) => cat === "全部" || p.cat === cat); // 由舊到新
  const years = [...new Set(events.map((p) => p.when.slice(0, 4)))];
  const n = visible.length;

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setK((prev) => {
      const next = (prev ?? -1) + 1;
      if (next >= n) { setPlaying(false); return prev; }
      return next;
    }), 1800);
    return () => clearInterval(t);
  }, [playing, n]);

  useEffect(() => {
    if (k === null || !visible[k]) return;
    refs.current[visible[k].i]?.scrollIntoView({ block: "center", behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k]);

  const play = () => {
    if (playing) { setPlaying(false); return; }
    setK(k === null || k >= n - 1 ? 0 : k + 1);
    setPlaying(true);
  };
  const showAll = () => { setPlaying(false); setK(null); };
  const pick = (c: string) => { setCat(c); setPlaying(false); setK(null); };
  const pct = k === null ? 0 : ((k + 1) / n) * 100;
  const order = new Map(visible.map(({ i }, ci) => [i, ci])); // 原始索引 → 在可見清單中的順序

  return (
    <>
      <div className="tl-player reveal">
        <button className="btn sm" onClick={play}><Icon name={playing ? "pause" : "play"} />{playing ? "暫停" : "播放"}</button>
        <button className="btn ghost sm" onClick={showAll}><Icon name="prev" />全部顯示</button>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="track"><i style={{ width: pct + "%" }} /><div className="knob" style={{ left: pct + "%" }} /></div>
          <div className="years">{years.map((y) => <span key={y}>{y}</span>)}</div>
        </div>
        <div className="now">{k === null ? "全部" : visible[k]?.p.when}</div>
      </div>
      <div className="tl-filters">
        {cats.map((c) => (
          <button key={c} className={c === cat ? "chip on" : "chip"} onClick={() => pick(c)}>
            {c !== "全部" && <span className="dot" style={{ color: colorOf(c) }} />}{c}
          </button>
        ))}
      </div>
      <div className="timeline">
        {events.map((p, i) => ({ p, i })).reverse().map(({ p, i }) => {
          const ci = order.get(i);
          const cls = ["tl-item", p.future && "future", ci === undefined && "hide", k !== null && ci !== undefined && ci > k && "dim", k !== null && ci === k && "lit"].filter(Boolean).join(" ");
          return (
            <div key={p.when + p.t} ref={(el) => { refs.current[i] = el; }} className={cls} style={{ "--c": colorOf(p.cat) } as React.CSSProperties}>
              <div className="when">{p.when}</div>
              <div className="card">
                <span className="tag" style={{ background: colorOf(p.cat), color: "#fff" }}>{p.cat}</span> <b>{p.t}</b>
                <p>{p.s}</p>
                <div className="impact">{p.i}</div>
                {p.url && <div className="src"><a href={p.url} target="_blank" rel="noopener">{p.src} ↗</a></div>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
