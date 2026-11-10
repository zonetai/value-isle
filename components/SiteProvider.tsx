"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { DATA } from "@/data/site";
import { DAILY } from "@/data/daily";
import { layerOf, md, type Season } from "@/lib/site";
import { Icon } from "./Icon";

/* ============================================================
   全站共用狀態：市場季節（跨頁保存在瀏覽器）、四層抽屜、提示訊息
   ============================================================ */
type Site = {
  season: Season;
  setSeason: (s: Season, silent?: boolean) => void;
  openDrawer: (layerId: string, focusTitle?: string) => void;
  toast: (msg: string, ms?: number) => void;
};
const Ctx = createContext<Site | null>(null);
export const useSite = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSite 必須在 SiteProvider 裡面使用");
  return c;
};

const KEY = "vi-season";
const isSeason = (s: unknown): s is Season => typeof s === "string" && s in DATA.seasons;

export function SiteProvider({ children }: { children: React.ReactNode }) {
  /* 伺服器端一律先畫「復甦」；載入後換成這位訪客上次選的季節 */
  const [season, setSeasonState] = useState<Season>("spring");
  const [drawer, setDrawer] = useState<{ layer: string; focus?: string } | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; id: number } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((text: string, ms = 2200) => {
    setToastMsg({ text, id: Date.now() });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), ms);
  }, []);

  const setSeason = useCallback(
    (s: Season, silent?: boolean) => {
      setSeasonState(s);
      document.body.dataset.season = s;
      try { localStorage.setItem(KEY, s); } catch {}
      if (!silent) toast(`市場季節切換為「${DATA.seasons[s].name}」`);
    },
    [toast],
  );

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(KEY); } catch {}
    if (isSeason(saved)) { setSeasonState(saved); document.body.dataset.season = saved; }
  }, []);

  const openDrawer = useCallback((layer: string, focus?: string) => setDrawer({ layer, focus }), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawer(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Ctx.Provider value={{ season, setSeason, openDrawer, toast }}>
      {children}
      <Drawer state={drawer} onClose={() => setDrawer(null)} />
      <div className={toastMsg ? "toast show" : "toast"} role="status" aria-live="polite">{toastMsg?.text}</div>
    </Ctx.Provider>
  );
}

/* ---------- 四層抽屜：某一層的說明、觀測項目與最新動態 ---------- */
function Drawer({ state, onClose }: { state: { layer: string; focus?: string } | null; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!state?.focus || !panel.current) return;
    const el = panel.current.querySelector<HTMLElement>("[data-focus='1']");
    if (el) setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 120);
  }, [state]);
  if (!state) return <div className="drawer" />;
  const l = layerOf(state.layer);
  const news = DAILY.briefs.filter((b) => b.layer === l.id).slice(0, 3);
  const toDaily = l.page.startsWith("/daily");
  return (
    <div className="drawer open">
      <div className="mask" onClick={onClose} />
      <div className="panel" ref={panel} style={{ "--c": l.color } as React.CSSProperties} role="dialog" aria-label={l.name}>
        <button className="close" aria-label="關閉" onClick={onClose}><Icon name="close" /></button>
        <span className="kicker">第 {+l.n} 層</span>
        <h3>{l.name}</h3>
        <p style={{ color: "var(--ink-2)", margin: 0 }}>{l.desc}</p>
        <div className="why"><b>估價師怎麼看：</b>{l.why}</div>
        {news.length > 0 && (
          <div className="dr-news">
            <div className="dr-news-head">
              <span><i className="ld-live" />最新動態</span>
              <Link href={`/daily#layer-${l.id}`} onClick={onClose}>全部動態</Link>
            </div>
            {news.map((b) => (
              <a key={b.url + b.t} href={b.url} target="_blank" rel="noopener">
                <span className="date">{md(b.d)}</span>
                <span><b>{b.t}</b><small>{b.i || b.s}</small></span>
              </a>
            ))}
          </div>
        )}
        <div className="items">
          {l.items.map((i) => (
            <div className="card" key={i.t} data-focus={i.t === state.focus ? "1" : undefined} style={i.t === state.focus ? { borderColor: "var(--c)" } : undefined}>
              <b>{i.t}</b>
              <p>{i.s}</p>
              <div className="impact"><b>對估價的影響：</b>{i.i}</div>
            </div>
          ))}
        </div>
        <div className="goto">
          <Link className="btn" href={l.page} onClick={onClose}>{toDaily ? "看這一層的最新動態" : `進入「${l.name}」頁`}</Link>
        </div>
      </div>
    </div>
  );
}
