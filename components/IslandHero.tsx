"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { DATA } from "@/data/site";
import { KN } from "@/data/knowledge";
import { DAILY } from "@/data/daily";
import { AMBIENT, NPCS } from "@/data/walk";
import type { OutlookItem } from "@/data/daily-types";
import { layerOf, md, type Season } from "@/lib/site";
import { G } from "./Gloss";
import { Icon } from "./Icon";
import { StoryBook, READ_KEY } from "./StoryBook";
import { SurveyReport } from "./SurveyReport";
import { STORIES } from "@/data/stories";
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
  walk: (on: boolean) => void; walkNpc: (id: string) => void; walkTalking: (id: string | null) => void;
  walkFly: (on: boolean) => boolean; walkLift: (v: number) => void; walkRide: (on: boolean) => boolean; walkTram: (on: boolean, kind?: string) => boolean; walkBoost: () => boolean; hold: (on: boolean) => void;
  dispose: () => void;
};
type SeasonFn = (s: Season, data: (typeof DATA.seasons)[Season]) => void;
type Scenario = (typeof DATA.scenarios)[number];
type Card = { mode: "spot" | "sc"; id: string; n: number; stamp?: boolean } | null;
type Near = { kind: "npc" | "spot" | null; id?: string; label?: string; spot?: string };
const NPC = Object.fromEntries(NPCS.map((n) => [n.id, n]));

const ALL_ITEMS = DATA.layers.flatMap((l) => l.items);
const NEW_COUNT = Object.fromEntries(DATA.layers.map((l) => [l.id, DAILY.briefs.filter((b) => b.layer === l.id).length]));
const TICKER = DAILY.briefs.slice(0, 6);
const SP = DATA.spots as Record<string, { layer: string; t: string; see: string; adj: string }>;
const SP_IDS = Object.keys(SP);
const WALK_FIG = `<svg viewBox="0 0 64 80" aria-hidden="true"><ellipse cx="32" cy="76" rx="16" ry="3" fill="rgba(0,0,0,.12)"/><rect x="18" y="34" width="28" height="40" rx="14" fill="#e8673a" stroke="#2a2520" stroke-width="2"/><rect x="18.5" y="56" width="27" height="4" fill="#faf4e8"/><circle cx="32" cy="26" r="13" fill="#f7d6bd" stroke="#2a2520" stroke-width="2"/><path d="M18 24a14 13 0 0 1 28 0z" fill="#faf4e8" stroke="#2a2520" stroke-width="2"/><path d="M16 24h32" stroke="#2a2520" stroke-width="2" stroke-linecap="round"/><path d="M32 11v13" stroke="#e8673a" stroke-width="3" stroke-linecap="round"/><circle cx="27.5" cy="29" r="1.6" fill="#2a2520"/><circle cx="36.5" cy="29" r="1.6" fill="#2a2520"/><path d="M29 33q3 2.4 6 0" fill="none" stroke="#2a2520" stroke-width="1.6" stroke-linecap="round"/></svg>`;
/* 勘查手冊的印章圖案 */
const SP_ICON: Record<string, string> = {
  tower: "building", apt: "house", mid: "building", shop: "tag", site: "crane", station: "rail", park: "tree", pylon: "bolt",
  vane: "compass", balloon: "balloon", turbine: "fan", gauge: "tide", buoy: "buoy", boat: "boat", ship: "ship", tanker: "oil",
  plane: "plane", office: "bars", town: "house", school: "cap", temple: "temple", gas: "fuel", farm: "sprout", presale: "deed",
  social: "key", plant: "chip", port: "exchange",
};
/* 每枚印章蓋下去的角度：依名稱固定（每次打開都一樣歪） */
const stampTilt = (id: string) => { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 997; return (h % 23) - 11; };
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
  /* 走進島上 */
  const [walking, setWalking] = useState(false);
  const [near, setNear] = useState<Near>({ kind: null });
  const [talk, setTalk] = useState<{ id: string; qi: number | null } | null>(null);
  const [people, setPeople] = useState(false);
  const [flying, setFlying] = useState(false);
  const [riding, setRiding] = useState(false);
  const [onTram, setOnTram] = useState(false);
  const [story, setStory] = useState<string | null>(null);
  /* 「走進島上」的邀請：第一次來、島浮上來以後跳出來；走進去過就不再出現 */
  const [walked, setWalked] = useState(true);
  const [invite, setInvite] = useState(false);
  const [invPos, setInvPos] = useState<{ left: number; top: number; arrow: number } | null>(null);
  const [guide, setGuide] = useState(-1);
  useEffect(() => { setWalked(store.get("vi-walked") === "1"); }, []);
  useEffect(() => {
    if (walked) return;
    let t: ReturnType<typeof setTimeout>;
    const onReady = () => { t = setTimeout(() => setInvite(true), 900); };
    document.addEventListener("island:ready", onReady);
    return () => { document.removeEventListener("island:ready", onReady); clearTimeout(t); };
  }, [walked]);
  /* 邀請卡對準「走進島上」按鈕 */
  useEffect(() => {
    if (!invite) return;
    const place = () => {
      const b = root.current?.querySelector(".walk-enter") as HTMLElement | null, h = root.current;
      if (!b || !h) return;
      const br = b.getBoundingClientRect(), hr = h.getBoundingClientRect(), w = Math.min(360, hr.width - 24);
      const cx = br.left + br.width / 2 - hr.left, left = Math.max(12, Math.min(hr.width - w - 12, cx - 46));
      setInvPos({ left, top: br.bottom - hr.top + 14, arrow: cx - left });
    };
    place(); window.addEventListener("resize", place); return () => window.removeEventListener("resize", place);
  }, [invite]);
  const enterWalk = () => {
    setInvite(false);
    const first = store.get("vi-walk-guide") !== "1";
    store.set("vi-walked", "1"); setWalked(true);
    api.current?.walk(true);
    if (first) setTimeout(() => setGuide(0), 1700);
  };
  /* 搭輕軌／搭船：還沒走進島上的話，先帶你走進去再上車 */
  const rideFrom = (kind: string) => {
    setCard(null);
    if (walkingRef.current) { api.current?.walkTram(true, kind); return; }
    store.set("vi-walked", "1"); setWalked(true); setInvite(false);
    api.current?.spotClear(true); api.current?.walk(true);
    setTimeout(() => api.current?.walkTram(true, kind), 1900);
  };
  const dismissInvite = () => { setInvite(false); setWalked(true); };
  const endGuide = () => { setGuide(-1); store.set("vi-walk-guide", "1"); };
  const [readSt, setReadSt] = useState<string[]>([]);
  useEffect(() => { try { const r = JSON.parse(store.get(READ_KEY) || "[]"); if (Array.isArray(r)) setReadSt(r); } catch {} }, []);
  const markRead = (sid: string) => setReadSt((r) => { if (r.includes(sid)) return r; const n2 = [...r, sid]; store.set(READ_KEY, JSON.stringify(n2)); return n2; });
  const [rideKind, setRideKind] = useState("tram");
  const [menu, setMenu] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [weather, setWeather] = useState<{ id: string; name: string } | null>(null);
  /* 全螢幕：支援的瀏覽器用真正的全螢幕；iPhone 的 Safari 不支援，就藏起導覽列、讓島佔滿整個螢幕 */
  const [immersive, setImmersive] = useState(false);
  const toggleFull = () => {
    const on = !immersive, html = document.documentElement;
    html.classList.toggle("immersive", on); setImmersive(on);
    if (on) { window.scrollTo({ top: 0 }); html.requestFullscreen?.().catch(() => {}); }
    else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    setTimeout(() => window.dispatchEvent(new Event("resize")), 60);
  };
  useEffect(() => {
    const f = () => { if (!document.fullscreenElement && document.documentElement.classList.contains("immersive") && immersiveViaFs.current) { document.documentElement.classList.remove("immersive"); setImmersive(false); } immersiveViaFs.current = !!document.fullscreenElement; };
    document.addEventListener("fullscreenchange", f);
    return () => { document.removeEventListener("fullscreenchange", f); document.documentElement.classList.remove("immersive"); };
  }, []);
  const immersiveViaFs = useRef(false);
  const walkingRef = useRef(false);
  const awayT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
    setCard({ mode: "spot", id, n: Date.now(), stamp: fresh && walkingRef.current });
    if (fresh && walkingRef.current && list.length < SP_IDS.length) site.current.toast(`蓋章！勘查手冊 ${list.length} / ${SP_IDS.length}`, 2400);
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
      api.current = initIsland({ root: root.current, D: DATA, KN, NPCS, AMBIENT, VI, navigate: (p: string) => router.push(p) }) as IslandApi | null;
    });
    const onSelect = (e: Event) => setOpenLayer((e as CustomEvent).detail.layer);
    const onSpot = (e: Event) => {
      const id = (e as CustomEvent).detail.id as string | null;
      if (id) showSpot(id); else if (cardRef.current?.mode === "spot") setCard(null);
    };
    const onWalk = (e: Event) => {
      const on = (e as CustomEvent).detail.on as boolean; walkingRef.current = on; setWalking(on); setTalk(null); setNear({ kind: null });
      if (on) { setListOpen(false); setInvite(false); setWalked(true); store.set("vi-walked", "1"); if (curScRef.current) { setCurSc(null); } setCard(null); window.scrollTo({ top: 0, behavior: "smooth" }); }
      else setCard(null);
    };
    const onNear = (e: Event) => {
      const n = (e as CustomEvent).detail as Near; setNear(n);
      setTalk((t) => (t && !(n.kind === "npc" && n.id === t.id) ? null : t));
      /* 走離那棟樓（身邊沒有任何可互動的東西超過 0.6 秒），卷宗自動收起來 */
      clearTimeout(awayT.current);
      if (cardRef.current?.mode === "spot" && !n.kind) awayT.current = setTimeout(() => { if (cardRef.current?.mode === "spot") setCard(null); }, 600);
    };
    document.addEventListener("island:select", onSelect);
    document.addEventListener("island:spot", onSpot);
    const onFly = (e: Event) => { setFlying((e as CustomEvent).detail.on); setTalk(null); };
    const onRide = (e: Event) => { setRiding((e as CustomEvent).detail.on); setTalk(null); setCard(null); };
    document.addEventListener("island:fly", onFly);
    document.addEventListener("island:ride", onRide);
    const onTramEv = (e: Event) => { const d = (e as CustomEvent).detail; setOnTram(d.on); if (d.kind) setRideKind(d.kind); setTalk(null); setCard(null); };
    document.addEventListener("island:tram", onTramEv);
    const onBump = () => toast("前面太淺了，船開不過去，轉個方向吧。", 2000);
    document.addEventListener("island:bump", onBump);
    const onWx = (e: Event) => setWeather((e as CustomEvent).detail);
    document.addEventListener("island:weather", onWx);
    const onBoost = (e: Event) => setBoosting((e as CustomEvent).detail.on);
    document.addEventListener("island:boost", onBoost);
    document.addEventListener("island:walk", onWalk);
    document.addEventListener("island:near", onNear);
    return () => {
      alive = false; api.current?.dispose(); api.current = null; seasonFns.current = [];
      document.removeEventListener("island:fly", onFly); document.removeEventListener("island:ride", onRide); document.removeEventListener("island:tram", onTramEv); document.removeEventListener("island:bump", onBump); document.removeEventListener("island:weather", onWx); document.removeEventListener("island:boost", onBoost); document.removeEventListener("island:walk", onWalk); document.removeEventListener("island:near", onNear);
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

  /* 告訴島現在正在跟誰說話（路人頭上的泡泡會顯示「說話中」） */
  useEffect(() => { api.current?.walkTalking?.(talk?.id ?? null); }, [talk]);

  /* 走路時打開卷宗、對話、名單：搖桿先收起來，不要蓋住按鈕 */
  useEffect(() => { root.current?.classList.toggle("walk-panel", walking && (!!card || !!talk || people || listOpen || guide >= 0 || menu)); }, [walking, card, talk, people, listOpen, guide, menu]);

  /* 索引收合：直接改 class（島嶼帶路時也會在同一個元素上加 touring，不能讓 React 覆寫 className） */
  useEffect(() => { root.current?.classList.toggle("idx-mini", mini); }, [mini]);

  /* 鍵盤：/ 搜尋、1–4 切換四層、G 勘查手冊、T 帶路、H 全景、Esc 收起 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement)?.closest?.("input,textarea,select")) return;
      if (e.key === "/") { e.preventDefault(); setMini(false, true); setTimeout(() => search.current?.focus(), 0); return; }
      const a = api.current; if (!a) return;
      if (walkingRef.current) {
        if (e.key === "Escape") { if (cardRef.current) setCard(null); else a.walk(false); }
        else if (e.key.toLowerCase() === "e" || e.key === "Enter") document.getElementById("walkAct")?.click();
        return;
      }
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

  /* 小遊戲「蓋高樓」：按了才下載；開著的時候島先暫停畫面 */
  const openGame = async () => {
    const { startStackGame } = await import("@/lib/stack-game.js");
    api.current?.hold(true);
    startStackGame({ onClose: () => api.current?.hold(false) });
  };

  /* 說明卡內容 */
  let cardBody: React.ReactNode = null, cardColor = "var(--accent)";
  if (card?.mode === "spot" && SP[card.id]) {
    const s = SP[card.id], L = layerOf(s.layer), id = card.id;
    cardColor = L.hex;
    const next = () => { const rest = SP_IDS.filter((x) => !seen.includes(x)); api.current?.spot(rest[0] || SP_IDS[(SP_IDS.indexOf(id) + 1) % SP_IDS.length]); };
    cardBody = (
      <SurveyReport id={id} no={SP_IDS.indexOf(id) + 1} name={s.t} layer={L.name} layerCls={L.cls} see={s.see} adj={s.adj} stamp={!!card.stamp}
        onClose={() => (walking ? setCard(null) : api.current?.spotClear())}
        extra={<>
        {id === "station" && (
          <button className="sc-game sc-tram" onClick={() => {
            rideFrom("tram");
          }}>
            <span className="sc-tram-i" aria-hidden="true"><Icon name="rail" /></span>
            <span><small>搭輕軌</small><b>坐上輕軌繞島一圈</b><em>沿著環島軌道看街景，想下車隨時按「下車」</em></span>
            <Icon name="play" />
          </button>
        )}
        {(id === "ship" || id === "tanker") && (
          <button className="sc-game sc-tram" onClick={() => {
            rideFrom(id);
          }}>
            <span className="sc-tram-i" aria-hidden="true"><Icon name={id === "ship" ? "ship" : "oil"} /></span>
            <span><small>搭船</small><b>{id === "ship" ? "登上貨櫃輪，自己掌舵" : "登上油輪，自己掌舵"}</b><em>用鍵盤或搖桿開船繞外海，下船時會開竹蜻蜓飛起來</em></span>
            <Icon name="play" />
          </button>
        )}
        {id === "site" && (
          <button className="sc-game" onClick={openGame}>
            <span className="sc-game-i" aria-hidden="true"><i /><i /><i /><i /></span>
            <span><small>小遊戲</small><b>在這塊都更基地蓋一棟樓</b><em>看準時機放下樓層，蓋得越高等級越高</em></span>
            <Icon name="play" />
          </button>
        )}
        </>}
        foot={<>
          <button className="btn sm" onClick={next}>{walking ? (seen.length < SP_IDS.length ? "走去下一處還沒看的" : "走去下一處") : seen.length < SP_IDS.length ? "去下一處還沒看的" : "下一處"}</button>
          <button className="btn ghost sm" onClick={() => openDrawer(s.layer)}>{L.name}的觀測項目</button>
          {walking && <button className="btn ghost sm" onClick={() => setCard(null)}>走出來</button>}
        </>} />
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
        {/* 進度條畫成一道浪：墨線隨載入進度往右畫出來（寬度由 island-scene.js 的 setProgress 控制） */}
        <div className="bar">
          <svg className="wave-bg" viewBox="0 0 200 16" aria-hidden="true"><path d="M0 8q12.5-7 25 0t25 0 25 0 25 0 25 0 25 0 25 0 25 0" /></svg>
          <i><svg viewBox="0 0 200 16" aria-hidden="true"><path d="M0 8q12.5-7 25 0t25 0 25 0 25 0 25 0 25 0 25 0 25 0" /></svg></i>
        </div>
        <small>潮水退去，島正在浮現…</small>
      </div>

      <div className="scene-tools">
        <button className="full-btn" onClick={toggleFull} aria-label={immersive ? "離開全螢幕" : "全螢幕"} title={immersive ? "離開全螢幕" : "全螢幕"}><span><Icon name={immersive ? "shrink" : "expand"} /></span><em>{immersive ? "離開全螢幕" : "全螢幕"}</em></button>
        <button className={walked ? "walk-enter" : "walk-enter hot"} onClick={enterWalk} title="變成島上的估價師，走進城裡跟路人聊天、進每棟樓看看"><span><Icon name="walk" /></span>走進島上{!walked && <em className="we-new">新玩法</em>}</button>
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

      {/* 走進島上：上方的回到空中、勘查章數；靠近人或建物時的互動鈕；對話框 */}
      {walking && (
        <>
          <div className="walk-hud">
            <span className="walk-hud-l">
              <button className="btn sm" onClick={() => api.current?.walk(false)}><Icon name="up" /><span className="wl">回到空中</span><span className="ws">離開</span></button>
              <button className="walk-book walk-full" onClick={toggleFull} aria-label={immersive ? "離開全螢幕" : "全螢幕"}><Icon name={immersive ? "shrink" : "expand"} /></button>
            </span>
            <span className="walk-hud-r">
              {onTram && rideKind === "tram" && <button className={boosting ? "walk-book boost on" : "walk-book boost"} onClick={() => api.current?.walkBoost()} aria-label="輕軌加速"><span className="bz" aria-hidden="true">⚡</span>{boosting ? "衝刺中" : "加速"}</button>}
              {onTram && <button className="walk-book on" onClick={() => { if (api.current?.walkTram(false) === false) toast("這裡不好下車，等一下再按。", 2200); }}><Icon name="prev" />{rideKind === "tram" ? "下車" : "下船"}</button>}
              {!riding && !onTram && (
                <button className={flying ? "walk-book on" : "walk-book"} onClick={() => {
                  const ok = api.current?.walkFly(!flying);
                  if (flying && ok === false) toast("下面是海：飛到島上、棧橋或外海小島上空才能降落。", 2800);
                }}><Icon name={flying ? "prev" : "up"} />{flying ? "降落" : "起飛"}</button>
              )}
              {riding && <button className="walk-book on" onClick={() => api.current?.walkRide(false)}><Icon name="balloon" /><span className="wl">跳下熱氣球</span><span className="ws">跳下</span></button>}
              {!onTram && !riding && (
                <span className="walk-menu">
                  <button className={menu ? "walk-book on" : "walk-book"} aria-expanded={menu} aria-haspopup="menu" onClick={() => { setMenu(!menu); setPeople(false); setListOpen(false); }}>
                    <Icon name="compass" /><span className="wl">探索</span><span className="ws">探索</span><i className="wm-caret" aria-hidden="true">▾</i>
                  </button>
                  {menu && (
                    <span className="walk-menu-list" role="menu">
                      {[
                        { k: "balloon", i: "balloon", t: "搭熱氣球", d: "繞島飛一圈，從高空俯瞰", go: () => { if (api.current?.walkRide(true)) toast("飛去熱氣球，到了就會搭上去。", 2200); } },
                        { k: "tram", i: "rail", t: "搭輕軌", d: "沿著環島軌道看街景", go: () => api.current?.walkTram(true, "tram") },
                        { k: "ship", i: "ship", t: "開貨櫃輪", d: "自己掌舵，繞著外海航行", go: () => api.current?.walkTram(true, "ship") },
                        { k: "tanker", i: "oil", t: "開油輪", d: "大船比較慢，轉彎要提早", go: () => api.current?.walkTram(true, "tanker") },
                        { k: "game", i: "building", t: "玩蓋高樓", d: "從透天厝蓋到哈里發塔", go: () => openGame() },
                      ].map((m) => (
                        <button key={m.k} role="menuitem" onClick={() => { setMenu(false); m.go(); }}>
                          <span className="wm-i" aria-hidden="true"><Icon name={m.i} /></span><span><b>{m.t}</b><small>{m.d}</small></span>
                        </button>
                      ))}
                    </span>
                  )}
                </span>
              )}
              <button className="walk-book" onClick={() => { setPeople(!people); setListOpen(false); }}><Icon name="talk" /><span className="wl">找人聊天</span><span className="ws">聊天</span></button>
              <button className="walk-book" onClick={() => { setListOpen(!listOpen); setPeople(false); }}><Icon name="book" /><span className="wl">勘查章 </span>{seen.length}/{SP_IDS.length}</button>
            </span>
          </div>
          {people && (
            <div className="walk-people">
              <small>島上可以聊天的人，點名字就會走過去</small>
              {NPCS.map((n) => (
                <button key={n.id} onClick={() => { setPeople(false); api.current?.walkNpc(n.id); }} style={{ "--c": layerOf(n.layer).hex } as React.CSSProperties}>
                  <b>{n.who}</b><span>{n.hello}</span>
                </button>
              ))}
            </div>
          )}
          <p key={onTram ? "t" : riding ? "r" : flying ? "f" : "w"} className="walk-hint">{onTram
            ? (rideKind === "tram" ? "搭輕軌中・拖曳畫面左右看・按「下車」就在軌道旁下車" : touch ? `你在開${rideKind === "ship" ? "貨櫃輪" : "油輪"}・搖桿往上加速、往下減速、左右轉向・按「下船」會飛起來` : `你在開${rideKind === "ship" ? "貨櫃輪" : "油輪"}・W/S 加速減速・A/D 轉向・拖曳畫面看四周・按「下船」會飛起來`)
            : riding
            ? (touch ? "熱氣球繞著島飄・搖桿上下調高度、左右調方向・拖曳畫面看四周" : "熱氣球繞著島飄・W/S 調高度・A/D 調方向・拖曳畫面看四周")
            : flying
            ? (touch ? "搖桿飛行・右邊 ↑↓ 升降・飛近船、飛機、風機可以進去看看・小島和棧橋也能降落" : "WASD 飛行・空白鍵上升・Shift 下降・飛近船、飛機、風機可以進去看看・小島和棧橋也能降落")
            : (touch ? "左下搖桿走路（推到底是快走）・拖曳畫面轉視角・點地面走過去" : "WASD 或方向鍵走路・按住 Shift 快走・拖曳畫面轉視角・點地面走過去・E 互動・Esc 離開")}</p>
          {(flying || riding) && (
            <div className="walk-lift">
              {[[1, "上升"], [-1, "下降"]].map(([v, t]) => (
                <button key={t} aria-label={t as string} onPointerDown={() => api.current?.walkLift(v as number)} onPointerUp={() => api.current?.walkLift(0)} onPointerLeave={() => api.current?.walkLift(0)} onPointerCancel={() => api.current?.walkLift(0)}>{v === 1 ? "↑" : "↓"}</button>
              ))}
            </div>
          )}
          {near.kind && !talk && !card && !riding && !onTram && (() => {
              const isN = near.kind === "npc", np = isN && near.id ? NPC[near.id] : null, sp = !isN && near.id ? SP[near.id] : null;
              const lay = layerOf((np?.layer || sp?.layer || "ind") as string), done = !!(sp && near.id && seen.includes(near.id)), read = !!(np && readSt.includes(np.id));
              return (
                <>
                <button id="walkAct" key={near.kind + ":" + near.id} className={isN ? "walk-act npc" : "walk-act spot"} style={{ "--c": lay.hex } as React.CSSProperties} onClick={() => {
                  if (isN && near.id) setTalk({ id: near.id, qi: null });
                  else if (near.id) showSpot(near.id);
                }}>
                  <span className="wa-av" aria-hidden="true">{isN ? <span className="wa-face"><i /><i /><b /></span> : <Icon name="building" />}</span>
                  <span className="wa-txt">
                    <small>{isN ? `${lay.name}・可以聊天` : done ? "已勘查・再看一次報告" : `${lay.name}・還沒勘查`}</small>
                    <b>{isN ? `和${near.label}說話` : `打開勘查報告：${sp?.t ?? ""}`}</b>
                    {isN && read && <em>故事書已讀</em>}
                  </span>
                  <kbd className="wa-key" aria-hidden="true">{touch ? "點我" : "E"}</kbd>
                </button>
                {isN && near.spot && SP[near.spot] && (
                  <button key={"rp-" + near.spot} className="walk-act2" onClick={() => showSpot(near.spot!)} style={{ "--c": layerOf(SP[near.spot].layer).hex } as React.CSSProperties}>
                    <Icon name="building" /><span>勘查報告<small>{SP[near.spot].t}</small></span>
                  </button>
                )}
                </>
              );
            })()}
          {talk && NPC[talk.id] && (() => {
            const n = NPC[talk.id], L = layerOf(n.layer), qa = talk.qi === null ? null : n.qs[talk.qi];
            return (
              <div className="walk-talk" style={{ "--c": L.hex } as React.CSSProperties} role="dialog" aria-label={`和${n.who}說話`}>
                <button className="close" aria-label="結束對話" onClick={() => setTalk(null)}><Icon name="close" /></button>
                <div className="wt-who"><span className="wt-face" aria-hidden="true"><Icon name="talk" /></span><span><b>{n.who}</b><small>{L.name}</small></span></div>
                {qa && <p className="wt-q">你：{qa.q}</p>}
                <p className="wt-a"><G>{qa ? qa.a : n.hello}</G></p>
                {STORIES[n.id] && (
                  <button className="wt-story" onClick={() => setStory(n.id)}>
                    <span className="wt-bk" aria-hidden="true"><Icon name="book" /></span>
                    <span><small>{n.id === "couple" ? "打開他們的故事" : "打開他的故事"}</small><b>{STORIES[n.id].title}</b></span>
                    {readSt.includes(n.id) ? <em className="wt-read">已讀</em> : <Icon name="next" />}
                  </button>
                )}
                {qa?.go && (
                  <button className="btn sm" onClick={() => {
                    const g = qa.go!; setTalk(null);
                    if (g.spot) api.current?.spot(g.spot); else if (g.href) { api.current?.walk(false); router.push(g.href); }
                  }}>{qa.go.label} →</button>
                )}
                <div className="wt-qs">
                  {n.qs.map((x, i) => i !== talk.qi && <button key={x.q} onClick={() => setTalk({ id: n.id, qi: i })}>{x.q}</button>)}
                  <button className="wt-bye" onClick={() => setTalk(null)}>先這樣，謝謝</button>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {story && NPC[story] && (
        <StoryBook id={story} who={NPC[story].who} color={layerOf(NPC[story].layer).hex}
          onClose={() => setStory(null)} onRead={markRead}
          onGo={(href) => { setStory(null); setTalk(null); api.current?.walk(false); router.push(href); }} />
      )}

      {invite && invPos && (
        <div className="walk-invite" role="dialog" aria-label="新玩法：走進島上" style={{ left: invPos.left, top: invPos.top, "--ax": `${invPos.arrow}px` } as React.CSSProperties}>
          <span className="wi-fig" aria-hidden="true" dangerouslySetInnerHTML={{ __html: WALK_FIG }} />
          <div>
            <small>新玩法</small>
            <b>走進島上，變成估價小尖兵</b>
            <p>在城裡走走、跟路人聊天、翻開他們的故事書；還能搭熱氣球和輕軌，在都更工地蓋一棟樓。</p>
            <div className="wi-btns"><button className="btn sm" onClick={enterWalk}>走進去看看</button><button className="btn ghost sm" onClick={dismissInvite}>等一下</button></div>
          </div>
        </div>
      )}

      {walking && onTram && rideKind === "tram" && boosting && <div className="speed-lines" aria-hidden="true" />}
      {weather && (
        <div key={weather.id} className={`wx-chip wx-${weather.id}`} title="島上的天氣每 3 分鐘會變一次（純粹好玩，跟市場季節無關）">
          <span className="wx-i" aria-hidden="true" />
          <span><small>島上天氣</small><b>{weather.name}</b></span>
        </div>
      )}

      {/* 第一次走進島上：三步驟小教學 */}
      {walking && guide >= 0 && (() => {
        const steps = [
          { t: "怎麼走", p: touch ? "左下角的搖桿控制方向，推到底是快走；也可以直接點地面，小尖兵會自己找路走過去。拖曳畫面可以轉視角。" : "WASD 或方向鍵走路，按住 Shift 快走；也可以直接點地面，小尖兵會自己找路走過去。拖曳畫面可以轉視角。", i: "walk" },
          { t: "跟人聊天、進去看看", p: "頭上有對話泡泡的是可以聊天的路人，聊完還能打開他們的故事書。走到建物旁邊按「進去看看」，就會在勘查手冊蓋上一枚章。", i: "talk" },
          { t: "還有更多玩法", p: "右上角可以起飛、搭熱氣球繞島俯瞰，也可以在都更工地玩「蓋高樓」。輕軌站可以搭車，貨櫃輪和油輪也能上船。", i: "balloon" },
        ], s = steps[guide];
        return (
          <div className="walk-guide" role="dialog" aria-label="走進島上的玩法">
            <button className="wg-x" aria-label="略過教學" onClick={endGuide}><Icon name="close" /></button>
            <span className="wg-i" aria-hidden="true"><Icon name={s.i} /></span>
            <small>{guide + 1} / {steps.length}</small>
            <b>{s.t}</b>
            <p>{s.p}</p>
            <div className="wg-foot">
              <span className="wg-dots">{steps.map((_, i) => <i key={i} className={i === guide ? "on" : ""} />)}</span>
              {guide < steps.length - 1 ? <button className="btn sm" onClick={() => setGuide(guide + 1)}>下一步</button> : <button className="btn sm" onClick={endGuide}>開始逛逛</button>}
            </div>
          </div>
        );
      })()}

      {/* 勘查手冊：島上所有可以點開的地方 */}
      <div className={listOpen ? "spot-list on" : "spot-list"} id="spotList">
        <div className="sl-head">
          <b><Icon name="book" />勘查手冊</b>
          <span className="sl-count"><em>{seen.length}</em> / {SP_IDS.length} 枚印章</span>
          <button className="sl-close" aria-label="關閉" onClick={() => setListOpen(false)}><Icon name="close" /></button>
        </div>
        <div className="sl-bar" aria-hidden="true"><i style={{ width: (seen.length / SP_IDS.length) * 100 + "%" }} /></div>
        {DATA.layers.map((l) => {
          const ids = SP_IDS.filter((id) => SP[id].layer === l.id), got = ids.filter((id) => seen.includes(id)).length;
          return (
            <section key={l.id} className={`sl-page sl-${l.id}`} style={{ "--c": l.color } as React.CSSProperties}>
              <h4><span>{l.name}</span><small>{got === ids.length ? "這一頁蓋滿了" : `${got} / ${ids.length}`}</small></h4>
              <div className="sl-stamps">
                {ids.map((id) => {
                  const on = seen.includes(id), n = SP_IDS.indexOf(id) + 1;
                  return (
                    <button key={id} className={on ? (id === seen[seen.length - 1] ? "stp on fresh" : "stp on") : "stp"} style={{ "--r": `${stampTilt(id)}deg` } as React.CSSProperties}
                      aria-label={`${SP[id].t}${on ? "（已蓋章）" : "（還沒去過）"}`} onClick={() => { setListOpen(false); api.current?.spot(id); }}>
                      <span className="stp-ink">
                        <Icon name={SP_ICON[id] ?? "pin"} />
                        <b>{SP[id].t}</b>
                        <small>No.{String(n).padStart(2, "0")}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
        <p className="sl-tip">點印章，鏡頭會帶你過去；走進島上走到建物旁邊打開卷宗，就會蓋上一枚。</p>
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
      <div key={card?.n ?? 0} className={cardBody ? (card?.mode === "spot" ? "scene-card on report" : "scene-card on") : "scene-card"} id="sceneCard" aria-live="polite" style={{ "--c": cardColor } as React.CSSProperties}>
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
          <button className="btn walk-cta" onClick={enterWalk}>
            <span className="wc-fig" aria-hidden="true" dangerouslySetInnerHTML={{ __html: WALK_FIG }} />
            <span><b>走進島上</b><small>跟路人聊天、搭熱氣球、玩蓋高樓</small></span>
          </button>
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
