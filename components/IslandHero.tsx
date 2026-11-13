"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { DATA } from "@/data/site";
import { KN } from "@/data/knowledge";
import { DAILY } from "@/data/daily";
import type { OutlookItem } from "@/data/daily-types";
import { layerOf, md, type Season } from "@/lib/site";
import { G } from "./Gloss";
import { Icon } from "./Icon";
import { useSite } from "./SiteProvider";

/* ============================================================
   首頁：3D 島嶼＋左邊介紹、右邊觀測索引、勘查手冊、「如果…」情境推演。
   島嶼本身（Three.js，lib/island-scene.js）在瀏覽器載入後才建立；
   它在 document 上發出 island:select、island:spot 事件，這裡接著更新畫面。
   ============================================================ */
type IslandApi = {
  select: (layer: string | null, openDrawer?: boolean) => void;
  spot: (id: string) => void; spotClear: (keepView?: boolean) => void;
  scenario: (sc: Scenario | null) => void;
  labels: (on: boolean) => void; currents: (on: boolean) => void; pause: (on: boolean) => void;
  bird: () => void; home: () => void;
  startTour: () => void; stopTour: () => void; tourNext: () => void; tourPrev: () => void;
  dispose: () => void;
};
type SeasonFn = (s: Season, data: (typeof DATA.seasons)[Season]) => void;
type Scenario = (typeof DATA.scenarios)[number];
type Card = { mode: "spot" | "sc"; id: string; n: number } | null;

const ALL_ITEMS = DATA.layers.flatMap((l) => l.items);
const NEW_COUNT = Object.fromEntries(DATA.layers.map((l) => [l.id, DAILY.briefs.filter((b) => b.layer === l.id).length]));
const TICKER = DAILY.briefs.slice(0, 6);
const SP = DATA.spots as Record<string, { layer: string; t: string; see: string; adj: string }>;
const SP_IDS = Object.keys(SP);
const OUT = DAILY.outlook ?? null;
const outOf = (id: string): OutlookItem | null => OUT?.items?.[id] ?? null;
const leanCls = (l: string) => ({ 正在發生: "hot", 已發生: "hot", 較可能: "warm", 可能性各半: "mid", 較不可能: "cold" } as Record<string, string>)[l] || "mid";
const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} },
};

/** 四個儀表在某個情境下的增減 */
function Deltas({ sc, style }: { sc: Scenario; style?: React.CSSProperties }) {
  return (
    <div className="sc-deltas" style={style}>
      {DATA.gauges.map((g, i) => {
        const d = sc.d[i];
        return (
          <span key={g.id} style={{ "--c": g.color } as React.CSSProperties} className={d > 0 ? "up" : d < 0 ? "dn" : "flat"}>
            {g.name}<b>{d ? (d > 0 ? "+" : "−") + Math.abs(d) : "不變"}</b>
          </span>
        );
      })}
    </div>
  );
}

/** 情境推演的「看依據」側欄 */
function Basis({ sc }: { sc: Scenario }) {
  const o = outOf(sc.id);
  return (
    <>
      <span className="kicker"><Icon name="branch" />情境推演</span>
      <h3>如果{sc.t}</h3>
      {o && (
        <>
          <div className="sc-lean" style={{ marginTop: 10 }}><span className={`lean ${leanCls(o.lean)}`}>目前：{o.lean}</span></div>
          <p className="ob-now">{o.now}</p>
          <h4 className="ob-h">關鍵條件</h4>
          <ul className="ob-why">{(o.why ?? []).map((w) => <li key={w}>{w}</li>)}</ul>
          <h4 className="ob-h">目前的數據與出處</h4>
          <div className="ob-basis">
            {o.basis.map((b) => {
              const meta = `${b.src ?? ""}${b.d ? "・" + b.d : ""}`;
              return b.url
                ? <a key={b.t} href={b.url} target="_blank" rel="noopener"><b>{b.t}</b><small>{meta} ↗</small></a>
                : <a key={b.t}><b>{b.t}</b><small>{meta}</small></a>;
            })}
          </div>
        </>
      )}
      <h4 className="ob-h">發生之後，四層怎麼連動</h4>
      <p style={{ margin: 0, color: "var(--ink-2)", fontSize: ".92rem" }}><G>{sc.text}</G></p>
      <Deltas sc={sc} style={{ marginTop: 12 }} />
      <div className="why"><b>估價師怎麼讀：</b><G>{sc.read}</G></div>
      <p className="disclaimer">{OUT?.updated ? `方向判讀整理至 ${OUT.updated}。` : ""}{OUT?.note || DATA.scenarioNote}</p>
    </>
  );
}

export function IslandHero() {
  const { season, toast, openDrawer, openPanel } = useSite();
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
  const [mini, setMiniState] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [seen, setSeenState] = useState<string[]>([]);
  const [curSc, setCurScState] = useState<string | null>(null);
  const [card, setCardState] = useState<Card>(null);
  const search = useRef<HTMLInputElement>(null);

  /* 事件處理器裡要讀到最新值，狀態另外放一份在 ref */
  const seenRef = useRef<string[]>([]), curScRef = useRef<string | null>(null), cardRef = useRef<Card>(null);
  const setSeen = (v: string[]) => { seenRef.current = v; setSeenState(v); store.set("vi-spots", JSON.stringify(v)); };
  const setCurSc = (v: string | null) => { curScRef.current = v; setCurScState(v); };
  const setCard = (v: Card) => { cardRef.current = v; setCardState(v); };
  const setMini = (m: boolean, save?: boolean) => { setMiniState(m); if (save) store.set("vi-idx-mini", m ? "1" : "0"); };

  /* ---------- 勘查手冊 ---------- */
  const showSpot = useCallback((id: string) => {
    const s = SP[id]; if (!s) return;
    let list = seenRef.current;
    const fresh = !list.includes(id);
    if (fresh) { list = [...list, id]; setSeen(list); }
    if (curScRef.current) setCurSc(null);
    setCard({ mode: "spot", id, n: Date.now() });
    if (fresh && list.length === SP_IDS.length) site.current.toast(`${SP_IDS.length} 處都看過了，你已經走完一趟現場勘查。`, 4200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- 情境推演 ---------- */
  const clearScenario = useCallback(() => {
    if (!curScRef.current) return;
    setCurSc(null);
    if (cardRef.current?.mode === "sc") setCard(null);
    api.current?.scenario(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setScenario = (id: string) => {
    const sc = DATA.scenarios.find((s) => s.id === id); if (!sc || !api.current) return;
    if (curScRef.current === id) { clearScenario(); return; }
    setCurSc(id); api.current.scenario(sc);
    setCard({ mode: "sc", id, n: Date.now() });
  };
  const startTour = useCallback(() => {
    if (!api.current) return;
    if (curScRef.current) setCurSc(null);
    setCard(null); setListOpen(false);
    api.current.startTour();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      api.current = initIsland({ root: root.current, D: DATA, KN, VI, navigate: (p: string) => router.push(p) }) as IslandApi | null;
    });
    const onSelect = (e: Event) => setOpenLayer((e as CustomEvent).detail.layer);
    const onSpot = (e: Event) => {
      const id = (e as CustomEvent).detail.id as string | null;
      if (id) showSpot(id); else if (cardRef.current?.mode === "spot") setCard(null);
    };
    document.addEventListener("island:select", onSelect);
    document.addEventListener("island:spot", onSpot);
    return () => {
      alive = false; api.current?.dispose(); api.current = null; seasonFns.current = [];
      document.removeEventListener("island:select", onSelect); document.removeEventListener("island:spot", onSpot);
    };
  }, [router, showSpot]);

  /* 季節換了就通知島嶼（光線、潮位、粒子）；正在推演的情境收掉 */
  useEffect(() => {
    seasonNow.current = season;
    seasonFns.current.forEach((fn) => fn(season, DATA.seasons[season]));
    clearScenario();
    setMeter(false);
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setMeter(true)));
    return () => cancelAnimationFrame(r);
  }, [season, clearScenario]);

  /* 載入瀏覽器記住的狀態；觸控裝置換提示字；底部跑馬燈 */
  useEffect(() => {
    try { const s = JSON.parse(store.get("vi-spots") || "[]"); if (Array.isArray(s)) { seenRef.current = s.filter((id) => SP[id]); setSeenState(seenRef.current); } } catch {}
    const m = store.get("vi-idx-mini");
    setMiniState(m === null ? innerWidth < 1500 : m === "1");
    setTouch(matchMedia("(pointer:coarse)").matches);
    let iv: ReturnType<typeof setInterval> | undefined;
    const t = TICKER.length ? setTimeout(() => { setTick(0); iv = setInterval(() => setTick((i) => (i + 1) % TICKER.length), 5200); }, 9000) : undefined;
    return () => { clearTimeout(t); clearInterval(iv); };
  }, []);

  /* 索引收合：直接改 class（島嶼帶路時也會在同一個元素上加 touring，不能讓 React 覆寫 className） */
  useEffect(() => { root.current?.classList.toggle("idx-mini", mini); }, [mini]);

  /* 鍵盤：/ 搜尋、1–4 切換四層、G 勘查手冊、T 帶路、H 全景、Esc 收起 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement)?.closest?.("input,textarea,select")) return;
      if (e.key === "/") { e.preventDefault(); setMini(false, true); setTimeout(() => search.current?.focus(), 0); return; }
      const a = api.current; if (!a) return;
      const n = "1234".indexOf(e.key), key = e.key.toLowerCase();
      if (n >= 0 && e.key.length === 1) { a.spotClear(true); a.select(DATA.layers[n].id); }
      else if (key === "g") setListOpen((o) => !o);
      else if (key === "t") startTour();
      else if (key === "h") { a.spotClear(true); a.home(); }
      else if (e.key === "Escape") { setListOpen(false); if (curScRef.current) clearScenario(); else a.spotClear(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTour, clearScenario]);

  const S = DATA.seasons[season];
  const sc = curSc ? DATA.scenarios.find((s) => s.id === curSc) ?? null : null;
  const vals = S.gauges.map((v, i) => Math.max(0, Math.min(100, v + (sc ? sc.d[i] : 0))));
  const tool = (t: "labels" | "currents" | "pause" | "spots" | "bird" | "home" | "tour") => {
    if (t === "spots") { setListOpen(!listOpen); return; }
    const a = api.current; if (!a) return;
    if (t === "labels" || t === "currents" || t === "pause") {
      const on = !tools[t]; setTools({ ...tools, [t]: on });
      if (t === "labels") a.labels(on); if (t === "currents") a.currents(on); if (t === "pause") a.pause(on);
    }
    if (t === "bird") a.bird();
    if (t === "home") { a.spotClear(true); a.home(); }
    if (t === "tour") startTour();
  };
  const rowClick = (id: string) => {
    if (api.current) { api.current.spotClear(true); api.current.select(id); } else setOpenLayer(openLayer === id ? null : id);
  };
  const query = q.trim().toLowerCase();
  const b = tick >= 0 ? TICKER[tick] : null;

  /* 說明卡內容 */
  let cardBody: React.ReactNode = null, cardColor = "var(--accent)";
  if (card?.mode === "spot" && SP[card.id]) {
    const s = SP[card.id], L = layerOf(s.layer), id = card.id;
    cardColor = L.hex;
    const next = () => { const rest = SP_IDS.filter((x) => !seen.includes(x)); api.current?.spot(rest[0] || SP_IDS[(SP_IDS.indexOf(id) + 1) % SP_IDS.length]); };
    cardBody = (
      <>
        <button className="close" aria-label="關閉" onClick={() => api.current?.spotClear()}><Icon name="close" /></button>
        <div className="sc-top"><span className={`tag ${L.cls}`}>{L.name}</span><span className="sc-prog"><Icon name="book" />勘查手冊 {seen.length} / {SP_IDS.length}</span></div>
        <h4>{s.t}</h4>
        <div className="sc-two">
          <div><b>現場看到</b><p><G>{s.see}</G></p></div>
          <div><b>估價怎麼處理</b><p><G>{s.adj}</G></p></div>
        </div>
        <div className="sc-foot">
          <button className="btn sm" onClick={next}>{seen.length < SP_IDS.length ? "去下一處還沒看的" : "下一處"}</button>
          <button className="btn ghost sm" onClick={() => openDrawer(s.layer)}>{L.name}的觀測項目</button>
        </div>
      </>
    );
  } else if (card?.mode === "sc" && sc) {
    const o = outOf(sc.id);
    cardColor = layerOf(sc.layer).hex;
    cardBody = (
      <>
        <button className="close" aria-label="關閉" onClick={clearScenario}><Icon name="close" /></button>
        <div className="sc-top"><span className="kicker"><Icon name="branch" />情境推演</span><button className="sc-reset" onClick={clearScenario}><Icon name="undo" />還原</button></div>
        <h4>如果{sc.t}</h4>
        {o && <div className="sc-lean"><span className={`lean ${leanCls(o.lean)}`}>目前：{o.lean}</span><span>{o.now}</span></div>}
        <Deltas sc={sc} />
        <p><G>{sc.text}</G></p>
        <div className="sc-foot">
          <button className="btn sm" onClick={() => openPanel(<Basis sc={sc} />, layerOf(sc.layer).hex)}><Icon name="deed" />{o ? `看依據（${o.basis.length} 則）` : "估價師怎麼讀"}</button>
          <small className="sc-note">{DATA.scenarioNote}</small>
        </div>
      </>
    );
  }

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
        <button className={listOpen ? "on" : undefined} onClick={() => tool("spots")} title="島上可以點開的勘查點"><span><Icon name="book" /></span>勘查 <em id="spotBadge">{seen.length}/{SP_IDS.length}</em></button>
        <button className={tools.pause ? "on" : undefined} onClick={() => tool("pause")}><span><Icon name={tools.pause ? "play" : "pause"} /></span>{tools.pause ? "繼續" : "暫停"}</button>
        <button onClick={() => tool("bird")}><span><Icon name="target" /></span>俯視</button>
        <button onClick={() => tool("home")} title="指針跟著視角轉，點一下回到全景">
          <span>
            <svg className="ic compass" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <g id="compassNeedle"><path d="M12 3.6 14.5 12h-5z" fill="#e4572e" /><path d="M12 20.4 9.5 12h5z" fill="currentColor" opacity=".32" /></g>
            </svg>
          </span>全景
        </button>
        <button onClick={() => tool("tour")}><span><Icon name="play" /></span>估價師帶路</button>
      </div>

      {/* 勘查手冊：島上所有可以點開的地方 */}
      <div className={listOpen ? "spot-list on" : "spot-list"} id="spotList">
        <div className="sl-head">
          <b><Icon name="book" />勘查手冊</b><span>{seen.length} / {SP_IDS.length} 處看過了</span>
          <button className="sl-close" aria-label="關閉" onClick={() => setListOpen(false)}><Icon name="close" /></button>
        </div>
        <div className="sl-bar"><i style={{ width: (seen.length / SP_IDS.length) * 100 + "%" }} /></div>
        {DATA.layers.map((l) => (
          <div key={l.id} className="sl-group" style={{ "--c": l.color } as React.CSSProperties}>
            <small>{l.name}</small>
            <div>
              {SP_IDS.filter((id) => SP[id].layer === l.id).map((id) => (
                <button key={id} className={seen.includes(id) ? "chip seen" : "chip"} onClick={() => { setListOpen(false); api.current?.spot(id); }}>
                  {seen.includes(id) && <Icon name="check" />}{SP[id].t}
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="sl-tip">點名稱，鏡頭會帶你過去；也可以直接點島上的建物、船和站點。</p>
      </div>

      {/* 情境推演：一件事發生，四層怎麼連動 */}
      <div className="whatif" id="whatif">
        <span className="wi-label"><Icon name="branch" />如果…</span>
        <div className="wi-chips">
          {DATA.scenarios.map((s) => {
            const o = outOf(s.id);
            return (
              <button key={s.id} className={s.id === curSc ? "on" : undefined} title={`如果${s.t}${o ? "｜目前：" + o.lean : ""}`} onClick={() => setScenario(s.id)}>
                <Icon name={s.ico} />{s.s || s.t}{o && <i className={`lean-dot ${leanCls(o.lean)}`} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 勘查筆記與情境推演共用的說明卡 */}
      <div key={card?.n ?? 0} className={cardBody ? "scene-card on" : "scene-card"} id="sceneCard" aria-live="polite" style={{ "--c": cardColor } as React.CSSProperties}>
        {cardBody}
      </div>

      {/* 左：介紹 */}
      <div className="hero-panel left">
        <span className="kicker">中泰不動產智庫</span>
        <h1>一塊地的價格，<br /><em>從四層看起。</em></h1>
        <p className="lede"><G>估價師看價格，不只看成交。外海的國際海象、天上的政策氣候、岸邊的市場潮位，最後才落到島上這塊地本身的條件。點島上的建物與船看勘查筆記，或在下方選一個「如果…」，看四層怎麼連動。</G></p>
        <div className="layer-meter" id="layerMeter">
          {DATA.gauges.map((g, i) => {
            const d = sc ? sc.d[i] : 0;
            return (
              <div key={g.id} style={{ "--c": g.color } as React.CSSProperties}>
                <span><Icon name={g.ico} />{g.name}</span>
                <span className="bar"><i style={{ width: meter ? vals[i] + "%" : 0 }} /></span>
                <b>{vals[i]}{d ? <em className={d > 0 ? "up" : "dn"}>{d > 0 ? "+" : "−"}{Math.abs(d)}</em> : null}</b>
              </div>
            );
          })}
        </div>
        <div className="note" id="seasonNote"><G>{S.note}</G></div>
        <div className="cta">
          <button className="btn" onClick={startTour}><Icon name="play" />估價師帶路（約 1 分鐘）</button>
          <Link className="btn ghost" href="/daily">看每日觀測</Link>
        </div>
        <div className="roles-row" id="heroRoles">
          你的身分：
          {DATA.roles.map((r, i) => (r.group ? null : <Link key={r.t} className="chip" href={`/roles#r${i}`}><Icon name={r.ico} />{r.t}</Link>))}
          <Link className="chip" href="/roles#pro"><Icon name="cap" />專業人士</Link>
        </div>
      </div>

      {/* 右：索引 */}
      <aside className="hero-panel right" id="indexPanel">
        <button className="panel-toggle" id="idxToggle" aria-label={mini ? "展開觀測索引" : "收合觀測索引"} title={mini ? "展開觀測索引" : "收合觀測索引"} onClick={() => setMini(!mini, true)}><Icon name="panel" /></button>
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
                <div className={openLayer === l.id ? "layer-row on" : "layer-row"} title={l.name} style={{ "--c": l.color } as React.CSSProperties} onClick={() => rowClick(l.id)} role="button" tabIndex={0} aria-expanded={showItems} onKeyDown={(e) => { if (e.key === "Enter") rowClick(l.id); }}>
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
          <span className="tk-hint">{touch ? "左右拖曳旋轉 ・ 雙指縮放 ・ 點建物與船看勘查筆記 ・ 點路人聽小知識" : "拖曳旋轉 ・ 滾輪縮放 ・ 點建物與船看勘查筆記 ・ 點海面起水波 ・ 按 1–4 切換四層"}</span>
        )}
      </Link>
    </section>
  );
}
