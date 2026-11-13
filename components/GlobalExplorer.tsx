"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DATA } from "@/data/site";
import { DAILY } from "@/data/daily";
import type { Brief } from "@/data/daily-types";
import { md } from "@/lib/site";
import { G } from "./Gloss";
import { Icon } from "./Icon";

/* ============================================================
   國際海象傳導圖：外部力量 → 傳導管道 → 估價參數 → 價格
   SVG 由資料算出來（伺服器端就畫好）；高亮上下游用 class 直接切換。
   ============================================================ */
const F = DATA.flow;
const CARDS = DATA.intl;
const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);
type K = "s" | "c" | "p";
type Node = { id: string; name: string; y: number; h: number; cy: number; [k: string]: unknown };
type Link = { a: string; b: string; w: number; st: number; id: string; y1?: number; y2?: number };

const W = 1180, H = 650, TX = 1078, TY = 326;
const COL = { s: { x: 16, w: 242 }, c: { x: 406, w: 196 }, p: { x: 750, w: 208 } };
const byId: Record<string, Node> = {};
const place = (list: readonly { id: string }[], h: number, top: number, bottom: number) => {
  const gap = (bottom - top - list.length * h) / (list.length - 1);
  return list.map((n, i) => { const y = top + i * (h + gap); const node = { ...n, y, h, cy: y + h / 2 } as unknown as Node; byId[n.id] = node; return node; });
};
const SOURCES = place(F.sources, 66, 72, 630) as (Node & (typeof F.sources)[number])[];
const CHANNELS = place(F.channels, 78, 100, 602) as (Node & (typeof F.channels)[number])[];
const PARAMS = place(F.params, 78, 100, 602) as (Node & (typeof F.params)[number])[];
const mk = (arr: readonly (readonly [string, string, number])[], st: number): Link[] => arr.map(([a, b, w], i) => ({ a, b, w, st, id: `l${st}_${i}` }));
const L1 = mk(F.links1 as unknown as [string, string, number][], 1), L2 = mk(F.links2 as unknown as [string, string, number][], 2);
const L3: Link[] = PARAMS.map((p, i) => ({ a: p.id, b: "tw", w: 2.2, st: 3, id: `l3_${i}` }));
const cyOf = (id: string) => (byId[id] ? byId[id].cy : TY);
function ports(links: Link[]) {
  const out: Record<string, Link[]> = {}, inn: Record<string, Link[]> = {};
  links.forEach((l) => { (out[l.a] ||= []).push(l); (inn[l.b] ||= []).push(l); });
  Object.values(out).forEach((a) => { a.sort((x, y) => cyOf(x.b) - cyOf(y.b)); a.forEach((l, i) => (l.y1 = cyOf(l.a) + (i - (a.length - 1) / 2) * 12)); });
  Object.values(inn).forEach((a) => { a.sort((x, y) => cyOf(x.a) - cyOf(y.a)); a.forEach((l, i) => (l.y2 = cyOf(l.b) + (i - (a.length - 1) / 2) * (l.b === "tw" ? 15 : 12))); });
}
ports(L1); ports(L2); ports(L3);
const X: Record<number, [number, number]> = { 1: [COL.s.x + COL.s.w, COL.c.x], 2: [COL.c.x + COL.c.w, COL.p.x], 3: [COL.p.x + COL.p.w, TX - 66] };
const colorOf = (l: Link) => (l.st === 1 ? (byId[l.a] as unknown as { color: string }).color : l.st === 2 ? "#2f8fb4" : "#5f9d4c");
const pathOf = (l: Link) => { const [x1, x2] = X[l.st], dx = (x2 - x1) * 0.5; return `M${x1} ${l.y1} C ${x1 + dx} ${l.y1}, ${x2 - dx} ${l.y2}, ${x2} ${l.y2}`; };

/** 每個外部力量最新的一則相關快訊（依 tags 比對標籤與標題） */
const briefsFor = (tags: readonly string[]): Brief[] => DAILY.briefs.filter((b) => b.layer === "intl" && tags.some((t) => ((b.tag || "") + b.t).includes(t)));

function buildSvg() {
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="國際海象傳導圖：外部力量經由傳導管道影響估價參數，最後到臺灣不動產價格">
    <defs><linearGradient id="fbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2fafd"/><stop offset="1" stop-color="#dcf0f6"/></linearGradient>
    <radialGradient id="fglow" cx="50%" cy="50%"><stop offset="0" stop-color="#8fd1e6" stop-opacity=".75"/><stop offset="1" stop-color="#8fd1e6" stop-opacity="0"/></radialGradient></defs>
    <rect width="${W}" height="${H}" rx="14" fill="url(#fbg)"/>`;
  for (let i = 0; i < 9; i++) s += `<path class="wv" style="animation-delay:${-i * 0.8}s" d="M-40 ${70 + i * 66} Q 80 ${58 + i * 66} 200 ${70 + i * 66} T 440 ${70 + i * 66} T 680 ${70 + i * 66} T 920 ${70 + i * 66} T 1160 ${70 + i * 66} T 1400 ${70 + i * 66}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.2"/>`;
  ([["外部力量", COL.s.x + 4, "start"], ["傳導管道", COL.c.x + 4, "start"], ["估價參數", COL.p.x + 4, "start"], ["價格", TX, "middle"]] as const).forEach(([t, x, a]) => { s += `<text class="hd" x="${x}" y="40" text-anchor="${a}">${t}</text>`; });
  [...L1, ...L2, ...L3].forEach((l, i) => {
    const d = pathOf(l), c = colorOf(l);
    s += `<path id="${l.id}" class="fl" data-id="${l.id}" d="${d}" stroke="${c}" stroke-width="${(l.w * 2.6).toFixed(1)}"/>
      <path class="fd" data-id="${l.id}" d="${d}" stroke-width="${Math.max(1.4, l.w * 0.9).toFixed(1)}" style="animation-delay:${-(i % 7) * 0.23}s"/>
      <circle class="dot" data-id="${l.id}" r="3.4" fill="${c}" stroke="#fff" stroke-width="1"><animateMotion dur="${(3.2 + (i % 5) * 0.6).toFixed(1)}s" repeatCount="indefinite" begin="${-(i * 0.41).toFixed(2)}s"><mpath href="#${l.id}"/></animateMotion></circle>`;
  });
  SOURCES.forEach((n) => {
    const x = COL.s.x, w = COL.s.w, b = briefsFor(n.tags)[0];
    const live = b ? `▸ ${md(b.d)} ${cut(b.t, 15)}` : `▸ ${cut(n.now, 19)}`, title = b ? `${b.t}（${b.src}）` : n.now;
    s += `<g class="n" data-k="s" data-id="${n.id}" style="--nc:${n.color}"><rect class="box" x="${x}" y="${n.y}" width="${w}" height="${n.h}" rx="12"/><rect x="${x}" y="${n.y + 10}" width="4" height="${n.h - 20}" rx="2" fill="${n.color}"/>
      <use href="#i-${n.ico}" x="${x + 13}" y="${n.y + 11}" width="23" height="23" style="color:${n.color}"/><text class="nm" x="${x + 44}" y="${n.y + 28}">${esc(n.name)}</text>
      <text class="live" x="${x + 14}" y="${n.y + 55}">${esc(live)}</text><title>${esc(title)}</title></g>`;
  });
  CHANNELS.forEach((n) => { const x = COL.c.x, w = COL.c.w;
    s += `<g class="n" data-k="c" data-id="${n.id}" style="--nc:#2f8fb4"><rect class="box" x="${x}" y="${n.y}" width="${w}" height="${n.h}" rx="12"/><rect x="${x}" y="${n.y + 12}" width="4" height="${n.h - 24}" rx="2" fill="#2f8fb4"/>
      <text class="nm" x="${x + 18}" y="${n.cy - 4}">${esc(n.name)}</text><text class="sb" x="${x + 18}" y="${n.cy + 16}">${esc(n.sub)}</text></g>`; });
  PARAMS.forEach((n) => { const x = COL.p.x, w = COL.p.w;
    s += `<g class="n" data-k="p" data-id="${n.id}" style="--nc:#5f9d4c"><rect class="box" x="${x}" y="${n.y}" width="${w}" height="${n.h}" rx="12"/><rect x="${x}" y="${n.y + 12}" width="4" height="${n.h - 24}" rx="2" fill="#5f9d4c"/>
      <text class="nm" x="${x + 18}" y="${n.cy - 4}">${esc(n.name)}</text><text class="sb" x="${x + 18}" y="${n.cy + 16}" fill="#5f9d4c">${esc(n.sub)}</text></g>`; });
  s += `<circle cx="${TX}" cy="${TY + 10}" r="92" fill="url(#fglow)"/>
    <g class="isle"><ellipse cx="${TX}" cy="${TY + 40}" rx="66" ry="20" fill="#bfe6f2"/><ellipse cx="${TX}" cy="${TY + 34}" rx="56" ry="17" fill="#e9d8a8"/><ellipse cx="${TX}" cy="${TY + 29}" rx="47" ry="13" fill="#7fbf63"/>
      <rect x="${TX - 34}" y="${TY - 18}" width="18" height="46" fill="#d9c7a6"/><rect x="${TX - 34}" y="${TY - 20}" width="18" height="4" fill="#b8a27c"/>
      <rect x="${TX - 11}" y="${TY - 58}" width="22" height="88" fill="#e9eef3"/>${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${TX - 11}" y="${TY - 50 + i * 13}" width="22" height="4" fill="#2a6f97" opacity=".6"/>`).join("")}<rect x="${TX - 12}" y="${TY - 61}" width="24" height="4" fill="#7b4fa3"/>
      <rect x="${TX + 16}" y="${TY - 8}" width="18" height="38" fill="#f2c9b6"/><rect x="${TX + 15}" y="${TY - 11}" width="20" height="4" fill="#7b4fa3"/>
      <circle cx="${TX - 44}" cy="${TY + 22}" r="7" fill="#3f8f3a"/><circle cx="${TX + 44}" cy="${TY + 24}" r="6" fill="#4da043"/></g>
    <text class="nm" x="${TX}" y="${TY + 84}" text-anchor="middle">臺灣不動產價格</text>`;
  F.targets.forEach((t, i) => { const x = TX - 49 + (i % 2) * 51, y = TY + 96 + Math.floor(i / 2) * 26; s += `<rect x="${x}" y="${y}" width="47" height="21" rx="10.5" fill="#fff" stroke="#cfe3dc"/><text class="sb" x="${x + 23.5}" y="${y + 15}" text-anchor="middle">${esc(t)}</text>`; });
  return s + `</svg>`;
}
const SVG = buildSvg();

function trace(k: K, id: string) {
  const S = new Set<string>(), C = new Set<string>(), Pm = new Set<string>(), links = new Set<string>();
  if (k === "s") { S.add(id); L1.filter((l) => l.a === id).forEach((l) => { links.add(l.id); C.add(l.b); }); }
  if (k === "c") { C.add(id); L1.filter((l) => l.b === id).forEach((l) => { links.add(l.id); S.add(l.a); }); }
  if (k === "p") { Pm.add(id); L2.filter((l) => l.b === id).forEach((l) => { links.add(l.id); C.add(l.a); }); L1.filter((l) => C.has(l.b)).forEach((l) => { links.add(l.id); S.add(l.a); }); }
  if (k !== "p") L2.filter((l) => C.has(l.a)).forEach((l) => { links.add(l.id); Pm.add(l.b); });
  L3.filter((l) => Pm.has(l.a)).forEach((l) => links.add(l.id));
  return { S, C, Pm, links };
}
const names = (set: Set<string>, list: readonly { id: string; name: string }[]) => list.filter((n) => set.has(n.id)).map((n) => n.name).join("、") || "—";

export function GlobalExplorer() {
  const wrap = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [cur, setCur] = useState<{ k: K; id: string }>({ k: "s", id: SOURCES[0].id });
  const [litCard, setLitCard] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pinned = useRef(false);

  const select = useCallback((k: K, id: string) => {
    const el = wrap.current; if (!el) return;
    const t = trace(k, id); el.classList.add("dim");
    el.querySelectorAll<SVGGElement>(".n").forEach((g) => { const kk = g.dataset.k, on = (kk === "s" ? t.S : kk === "c" ? t.C : t.Pm).has(g.dataset.id!); g.classList.toggle("on", on); });
    el.querySelectorAll<SVGElement>(".fl, .fd, .dot").forEach((e) => e.classList.toggle("on", t.links.has(e.dataset.id!)));
    setCur({ k, id });
  }, []);

  useEffect(() => {
    const el = wrap.current; if (!el) return;
    let auto = 0;
    select("s", SOURCES[0].id);
    timer.current = setInterval(() => { auto = (auto + 1) % SOURCES.length; select("s", SOURCES[auto].id); }, 4200); // 自動輪播，使用者一碰就停
    const stopAuto = () => { if (timer.current) { clearInterval(timer.current); timer.current = null; } };
    const cleanups: (() => void)[] = [];
    el.querySelectorAll<SVGGElement>(".n").forEach((g) => {
      const go = () => { stopAuto(); select(g.dataset.k as K, g.dataset.id!); };
      const enter = () => { if (!pinned.current) go(); };
      const click = (e: Event) => { e.stopPropagation(); pinned.current = true; go(); };
      g.addEventListener("mouseenter", enter); g.addEventListener("click", click);
      cleanups.push(() => { g.removeEventListener("mouseenter", enter); g.removeEventListener("click", click); });
    });
    /* 滑出圖外回到全貌；點空白處取消釘選 */
    const leave = () => { if (!pinned.current && !timer.current) el.classList.remove("dim"); };
    const blank = () => { pinned.current = false; stopAuto(); el.classList.remove("dim"); };
    el.addEventListener("mouseleave", leave); el.addEventListener("click", blank);
    return () => { stopAuto(); cleanups.forEach((f) => f()); el.removeEventListener("mouseleave", leave); el.removeEventListener("click", blank); };
  }, [select]);

  const t = trace(cur.k, cur.id);
  const n = byId[cur.id] as Node & Record<string, unknown>;
  let tags: string[] = [];
  let color: string;
  let head: React.ReactNode;
  let card: number | null = null;
  if (cur.k === "s") {
    const src = n as unknown as (typeof SOURCES)[number];
    tags = [...src.tags]; color = src.color; card = src.card ?? null;
    const c = card !== null ? CARDS[card] : undefined;
    head = <><span className="kicker">外部力量</span><h3><Icon name={src.ico} />{src.name}</h3><p><G>{c ? c.s : src.now}</G></p></>;
  } else {
    SOURCES.filter((s) => t.S.has(s.id)).forEach((s) => (tags = tags.concat(s.tags)));
    color = cur.k === "c" ? "#2f8fb4" : "#5f9d4c";
    const node = n as unknown as { name: string; sub: string; d?: string };
    head = <><span className="kicker">{cur.k === "c" ? "傳導管道" : "估價參數 · " + node.sub}</span><h3>{node.name}</h3><p><G>{node.d || node.sub}</G></p></>;
  }
  const news = briefsFor(tags).slice(0, 3);
  const showCard = (i: number) => { setLitCard(i); cardRefs.current[i]?.scrollIntoView({ block: "center", behavior: "smooth" }); };

  return (
    <>
      <div className="flowmap reveal" id="flowmap" ref={wrap} dangerouslySetInnerHTML={{ __html: SVG }} />
      <p className="swipe-hint">左右滑動看完整傳導圖，點任一格看上下游</p>
      <div className="card flow-info" id="flowInfo" style={{ "--c": color } as React.CSSProperties}>
        <div>
          {head}
          {card !== null && CARDS[card] && <div style={{ marginTop: 10 }}><button className="btn ghost sm" onClick={() => showCard(card!)}>看完整傳導路徑 ↓</button></div>}
        </div>
        <div>
          <span className="kicker">這條路怎麼走</span>
          <div className="steps">
            <div><b>外部力量</b><span>{names(t.S, SOURCES)}</span></div>
            <div><b>傳導管道</b><span>{names(t.C, CHANNELS)}</span></div>
            <div><b>估價參數</b><span>{names(t.Pm, PARAMS)}</span></div>
            <div><b>最後</b><span>臺灣不動產價格</span></div>
          </div>
        </div>
        <div className="news">
          <span className="kicker"><i className="ld-live" /> 相關最新動態</span>
          {news.length ? news.map((b) => (
            <a key={b.url + b.t} href={b.url} target="_blank" rel="noopener"><b>{md(b.d)}</b>　{b.t}<small>{b.i || b.s}</small></a>
          )) : <p style={{ marginTop: 8 }}>近期沒有直接相關的快訊。</p>}
        </div>
      </div>

      <div className="section-head reveal" style={{ marginTop: 36 }}><div><h2>每股力量的傳導路徑</h2><p>滑過卡片，路徑會一步步亮起。</p></div></div>
      <div className="intl-grid" id="intlGrid">
        {CARDS.map((c, i) => (
          <div key={c.t} ref={(el) => { cardRefs.current[i] = el; }} className={litCard === i ? "card intl-card lit" : "card intl-card"}>
            <div className="ico"><Icon name={c.ico} /></div>
            <span className="from">{c.from}</span>
            <h3>{c.t}</h3>
            <p><G>{c.s}</G></p>
            <div className="path">{c.path.map((p) => <span key={p}><G>{p}</G></span>)}</div>
          </div>
        ))}
      </div>
    </>
  );
}
