"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { DATA } from "@/data/site";
import { KN } from "@/data/knowledge";
import { DAILY } from "@/data/daily";
import { layerOf, md, type Season } from "@/lib/site";
import { Icon } from "./Icon";
import { useSite } from "./SiteProvider";

type IslandApi = {
  select: (layer: string | null, openDrawer?: boolean) => void;
  labels: (on: boolean) => void; currents: (on: boolean) => void; pause: (on: boolean) => void;
  bird: () => void; home: () => void;
  startTour: () => void; stopTour: () => void; tourNext: () => void; tourPrev: () => void;
  dispose: () => void;
};
type SeasonFn = (s: Season, data: (typeof DATA.seasons)[Season]) => void;

const ALL_ITEMS = DATA.layers.flatMap((l) => l.items);
const NEW_COUNT = Object.fromEntries(DATA.layers.map((l) => [l.id, DAILY.briefs.filter((b) => b.layer === l.id).length]));
const TICKER = DAILY.briefs.slice(0, 6);

/** 首頁：3D 島嶼＋左邊介紹、右邊觀測索引；島嶼本身（Three.js）在瀏覽器載入後才建立 */
export function IslandHero() {
  const { season, toast, openDrawer } = useSite();
  const router = useRouter();
  const root = useRef<HTMLElement>(null);
  const api = useRef<IslandApi | null>(null);
  const seasonFns = useRef<SeasonFn[]>([]);
  const seasonNow = useRef(season);
  const site = useRef({ toast, openDrawer });
  site.current = { toast, openDrawer };

  const [openLayer, setOpenLayer] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [tools, setTools] = useState({ labels: true, currents: true, pause: false });
  const [meter, setMeter] = useState(false);
  const [tick, setTick] = useState(-1);
  const [touch, setTouch] = useState(false);
  const search = useRef<HTMLInputElement>(null);

  /* 建立島嶼；離開首頁時收掉 */
  useEffect(() => {
    let alive = true;
    import("@/lib/island-scene").then(({ initIsland }) => {
      if (!alive || !root.current) return;
      const VI = {
        toast: (m: string, ms?: number) => site.current.toast(m, ms),
        openDrawer: (l: string) => site.current.openDrawer(l),
        onSeason: (fn: SeasonFn) => { seasonFns.current.push(fn); fn(seasonNow.current, DATA.seasons[seasonNow.current]); },
      };
      api.current = initIsland({ root: root.current, D: DATA, KN, VI, navigate: (p: string) => router.push(p), onSelect: (l: string | null) => setOpenLayer(l) }) as IslandApi | null;
    });
    return () => { alive = false; api.current?.dispose(); api.current = null; seasonFns.current = []; };
  }, [router]);

  /* 季節換了就通知島嶼（光線、潮位、粒子） */
  useEffect(() => {
    seasonNow.current = season;
    seasonFns.current.forEach((fn) => fn(season, DATA.seasons[season]));
    setMeter(false);
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setMeter(true)));
    return () => cancelAnimationFrame(r);
  }, [season]);

  /* 按 / 跳到搜尋框；觸控裝置換提示字；底部跑馬燈 */
  useEffect(() => {
    setTouch(matchMedia("(pointer:coarse)").matches);
    const onKey = (e: KeyboardEvent) => { if (e.key === "/" && (document.activeElement as HTMLElement)?.tagName !== "INPUT") { e.preventDefault(); search.current?.focus(); } };
    document.addEventListener("keydown", onKey);
    let iv: ReturnType<typeof setInterval> | undefined;
    const t = TICKER.length ? setTimeout(() => { setTick(0); iv = setInterval(() => setTick((i) => (i + 1) % TICKER.length), 5200); }, 6500) : undefined;
    return () => { document.removeEventListener("keydown", onKey); clearTimeout(t); clearInterval(iv); };
  }, []);

  const S = DATA.seasons[season];
  const tool = (t: "labels" | "currents" | "pause" | "bird" | "home" | "tour") => {
    const a = api.current; if (!a) return;
    if (t === "labels" || t === "currents" || t === "pause") {
      const on = !tools[t]; setTools({ ...tools, [t]: on });
      if (t === "labels") a.labels(on); if (t === "currents") a.currents(on); if (t === "pause") a.pause(on);
    }
    if (t === "bird") a.bird(); if (t === "home") a.home(); if (t === "tour") a.startTour();
  };
  const rowClick = (id: string) => { if (api.current) api.current.select(id); else setOpenLayer(openLayer === id ? null : id); };
  const query = q.trim().toLowerCase();
  const b = tick >= 0 ? TICKER[tick] : null;

  return (
    <section className="island-hero" id="top" ref={root}>
      <div id="island-canvas" />
      <div id="island-labels" className={tools.labels ? undefined : "hidden"} />

      <div className="fallback-scene">
        <div className="card" style={{ maxWidth: 520, textAlign: "center" }}>
          <b>你的瀏覽器無法顯示 3D 場景</b>
          <p style={{ color: "var(--ink-2)", fontSize: ".9rem" }}>請改用支援 WebGL 的瀏覽器，或直接從上方選單進入各頁。</p>
        </div>
      </div>

      <div className="loader" id="loader">
        <div className="big">價值島</div>
        <div className="bar"><i /></div>
        <small>潮水退去，島正在浮現…</small>
      </div>

      <div className="scene-tools">
        <button className={tools.labels ? "on" : undefined} onClick={() => tool("labels")}><span><Icon name="tag" /></span>標示</button>
        <button className={tools.currents ? "on" : undefined} onClick={() => tool("currents")}><span><Icon name="current" /></span>海流</button>
        <button className={tools.pause ? "on" : undefined} onClick={() => tool("pause")}><span><Icon name={tools.pause ? "play" : "pause"} /></span>{tools.pause ? "繼續" : "暫停"}</button>
        <button onClick={() => tool("bird")}><span><Icon name="target" /></span>俯視</button>
        <button onClick={() => tool("home")}><span><Icon name="isle" /></span>全景</button>
        <button onClick={() => tool("tour")}><span><Icon name="play" /></span>估價師帶路</button>
      </div>

      {/* 左：介紹 */}
      <div className="hero-panel left">
        <span className="kicker">中泰不動產智庫</span>
        <h1>一塊地的價格，<br />從四層看起。</h1>
        <p className="lede">估價師看價格，不只看成交。外海的國際海象、天上的政策氣候、岸邊的市場潮位，最後才落到島上這塊地本身的條件。拖動旋轉島嶼，點任一層的標示，或點島上走動的人聽一句估價小知識。</p>
        <div className="layer-meter" id="layerMeter">
          {DATA.gauges.map((g, i) => (
            <div key={g.id} style={{ "--c": g.color } as React.CSSProperties}>
              <span><Icon name={g.ico} />{g.name}</span>
              <span className="bar"><i style={{ width: meter ? S.gauges[i] + "%" : 0 }} /></span>
              <b>{S.gauges[i]}</b>
            </div>
          ))}
        </div>
        <div className="note" id="seasonNote">{S.note}</div>
        <div className="cta">
          <button className="btn" onClick={() => api.current?.startTour()}><Icon name="play" />估價師帶路（約 1 分鐘）</button>
          <Link className="btn ghost" href="/daily">看每日觀測</Link>
        </div>
        <div className="roles-row" id="heroRoles">
          你的身分：
          {DATA.roles.map((r, i) => (r.group ? null : <Link key={r.t} className="chip" href={`/roles#r${i}`}><Icon name={r.ico} />{r.t}</Link>))}
          <Link className="chip" href="/roles#pro"><Icon name="cap" />專業人士</Link>
        </div>
      </div>

      {/* 右：索引 */}
      <aside className="hero-panel right">
        <span className="kicker">觀測索引</span>
        <h2>四股力量，<br />一塊地的價格。</h2>
        <p className="sub">{DATA.layers.length} 個層次 ／ {ALL_ITEMS.length} 個觀測項目 ／ 每項附「對估價的影響」</p>
        <label className="search">
          <Icon name="search" />
          <input ref={search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋項目、關鍵字…" aria-label="搜尋觀測項目" />
          <kbd>/</kbd>
        </label>
        <div className="layer-list" id="layerList">
          {DATA.layers.map((l) => {
            const items = l.items.filter((i) => !query || (i.t + i.s + i.k).toLowerCase().includes(query));
            if (query && !items.length) return null;
            const g = DATA.gauges.find((x) => x.id === l.id);
            const showItems = openLayer === l.id || !!query;
            return (
              <Fragment key={l.id}>
                <div className={openLayer === l.id ? "layer-row on" : "layer-row"} style={{ "--c": l.color } as React.CSSProperties} onClick={() => rowClick(l.id)} role="button" tabIndex={0} aria-expanded={showItems} onKeyDown={(e) => { if (e.key === "Enter") rowClick(l.id); }}>
                  <span className="n">{g && <Icon name={g.ico} />}</span>
                  <span className="t">{l.name}<small>{NEW_COUNT[l.id] ? <><em>近期 {NEW_COUNT[l.id]} 則動態</em>・</> : null}{l.desc.split("。")[0]}</small></span>
                  <span className="cnt">{items.length} 項</span>
                </div>
                {showItems && items.map((i, idx) => (
                  <div key={i.t} className="item-row" style={{ "--c": l.color, animationDelay: idx * 40 + "ms" } as React.CSSProperties} onClick={(e) => { e.stopPropagation(); openDrawer(l.id, i.t); }}>
                    <span className="d" />
                    <span><b>{i.t}</b><small>{i.s}</small></span>
                  </div>
                ))}
              </Fragment>
            );
          })}
        </div>
      </aside>

      <div className="tour" id="tour">
        <span className="kicker">估價師帶路</span>
        <h4 /><p />
        <div className="bar"><i /></div>
        <div className="ctl">
          <button aria-label="上一站" onClick={() => api.current?.tourPrev()}><Icon name="prev" /></button>
          <button aria-label="下一站" onClick={() => api.current?.tourNext()}><Icon name="next" /></button>
          <button onClick={() => api.current?.stopTour()}>離開 <Icon name="close" /></button>
        </div>
      </div>

      <Link key={tick} className={b ? "scene-hint tk-in" : "scene-hint"} id="ticker" href="/daily">
        {b ? (
          <>
            <span className="tk-live" /><b>每日觀測</b><span className="tk-date">{md(b.d)}</span>
            <span className="tk-dot" style={{ background: layerOf(b.layer).hex }} /><span className="tk-text">{b.t}</span>
          </>
        ) : (
          <span className="tk-hint">{touch ? "左右拖曳旋轉 ・ 雙指縮放 ・ 點標示看細節 ・ 點路人聽小知識" : "拖曳旋轉 ・ 滾輪縮放 ・ 點標示看細節 ・ 點路人聽小知識"}</span>
        )}
      </Link>
    </section>
  );
}
