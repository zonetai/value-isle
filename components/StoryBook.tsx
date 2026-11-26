"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { STORIES } from "@/data/stories";
import { ART, portrait } from "@/data/story-art";
import { Icon } from "./Icon";

/* ============================================================
   路人的故事書：圖文、翻頁。
   電腦：攤開的一本書。左頁是貼在本子上的插圖（白框、和紙膠帶、手寫說明），右頁是文字。
         點兩側、按 ← →、或直接用滑鼠拖著頁角翻；紙會跟著手翻過去，放開時翻過一半就翻頁。
   手機：一次一頁，左右滑翻頁。
   蝴蝶頁是目錄，可以直接跳到某一章；讀到最後一頁會記成「已讀」。
   ============================================================ */
type Side = { kind: "toc" | "cover" | "art" | "text" | "last" | "who"; i?: number };
type Spread = { l: Side; r: Side };
type Flip = { dir: 1 | -1; from: number; to: number };
const CN = ["一", "二", "三", "四", "五", "六", "七", "八"];
export const READ_KEY = "vi-stories-read";

export function StoryBook({ id, who, color, onClose, onGo, onRead }: { id: string; who: string; color: string; onClose: () => void; onGo: (href: string) => void; onRead?: (id: string) => void }) {
  const st = STORIES[id];
  const spreads: Spread[] = st ? [{ l: { kind: "toc" }, r: { kind: "cover" } }, ...st.pages.map((_, i) => ({ l: { kind: "art" as const, i }, r: { kind: "text" as const, i } })), { l: { kind: "who" }, r: { kind: "last" } }] : [];
  const [at, setAt] = useState(0);
  const [flip, setFlip] = useState<Flip | null>(null);
  const [a, setA] = useState(0);            /* 翻頁進度 0～1 */
  const [anim, setAnim] = useState(false);  /* true：用轉場動畫走完；false：跟著手拖 */
  const [wide, setWide] = useState(true);
  const closeRef = useRef<HTMLButtonElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  /* 手機：手指滑動時，依捲動位置更新目前在第幾頁 */
  const onRail = () => { const r = rail.current; if (!r) return; const i = Math.round(r.scrollLeft / Math.max(1, r.clientWidth)); setAt((a) => (a === i ? a : i)); };
  const reduce = useRef(false);

  useEffect(() => { const m = window.matchMedia("(min-width: 760px)"); const f = () => setWide(m.matches); f(); m.addEventListener("change", f); reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches; return () => m.removeEventListener("change", f); }, []);
  useEffect(() => { closeRef.current?.focus(); document.documentElement.classList.add("sb-open"); return () => document.documentElement.classList.remove("sb-open"); }, []);
  useEffect(() => { if (st && at === spreads.length - 1) onRead?.(id); }, [at]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = useCallback((f: Flip, done: boolean) => { if (done) setAt(f.to); setFlip(null); setA(0); setAnim(false); }, []);
  /* 翻到第 to 個跨頁（可以一次跳好幾頁，例如從目錄跳章） */
  const turnTo = useCallback((to: number) => {
    if (flip || to === at || to < 0 || to >= spreads.length) return;
    /* 手機：頁面並排成一條，捲到那一頁（跟手機原生滑動一樣，不閃爍） */
    if (!wide) { const r = rail.current; if (r) r.scrollTo({ left: to * r.clientWidth, behavior: reduce.current ? "auto" : "smooth" }); setAt(to); return; }
    if (reduce.current) { setAt(to); return; }
    const f: Flip = { dir: to > at ? 1 : -1, from: at, to };
    setFlip(f); setA(0); setAnim(false);
    requestAnimationFrame(() => requestAnimationFrame(() => { setAnim(true); setA(1); }));
  }, [flip, at, spreads.length, wide]);
  const go = useCallback((dir: 1 | -1) => turnTo(at + dir), [turnTo, at]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); else if (e.key === "ArrowRight") go(1); else if (e.key === "ArrowLeft") go(-1); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [go, onClose]);

  /* ---------- 電腦：拖著頁角翻頁 ---------- */
  const drag = useRef<{ x: number; dir: 1 | -1; w: number; moved: boolean } | null>(null);
  const onPageDown = (e: React.PointerEvent, dir: 1 | -1) => {
    if (!wide || flip || (e.target as HTMLElement).closest("button,a")) return;
    const to = at + dir; if (to < 0 || to >= spreads.length) return;
    drag.current = { x: e.clientX, dir, w: (bookRef.current?.clientWidth || 800) / 2, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPageMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dx = (e.clientX - d.x) * -d.dir;
    if (!d.moved && Math.abs(dx) < 6) return;
    if (!d.moved) { d.moved = true; setFlip({ dir: d.dir, from: at, to: at + d.dir }); setAnim(false); }
    setA(Math.max(0, Math.min(1, dx / (d.w * 1.2))));
  };
  const onPageUp = () => {
    const d = drag.current; drag.current = null; if (!d) return;
    if (!d.moved) { go(d.dir); return; }
    setAnim(true); setA(a > 0.28 ? 1 : 0);
  };
  const onLeafEnd = () => { if (flip && anim) finish(flip, a >= 1); };
  /* 進度剛好已經在 0 或 1，不會觸發轉場結束事件，直接收尾 */
  useEffect(() => { if (flip && anim && wide) { const t = setTimeout(() => finish(flip, a >= 1), 900); return () => clearTimeout(t); } }, [flip, anim, a, wide, finish]);


  if (!st) return null;
  const n = st.pages.length;

  const face = (s: Side) => {
    if (s.kind === "toc") return (
      <div className="sb-toc">
        <div className="sb-toc-card">
          <small>{who}的故事</small>
          <b>目錄</b>
          <ol>
            {st.pages.map((pg, i) => (
              <li key={i}><button onClick={(e) => { e.stopPropagation(); turnTo(i + 1); }}><span>第{CN[i]}章</span><em>{pg.h}</em><i>{i + 1}</i></button></li>
            ))}
            <li><button onClick={(e) => { e.stopPropagation(); turnTo(n + 1); }}><span>結語</span><em>估價師的話</em><i>{n + 1}</i></button></li>
          </ol>
        </div>
      </div>
    );
    if (s.kind === "cover") return (
      <div className="sb-cover">
        <small className="sb-kick">價值島・路人的故事</small>
        <h3>{st.title}</h3>
        <div className="sb-art sb-portrait" dangerouslySetInnerHTML={{ __html: portrait(id) }} />
        <p className="sb-by">{who}　口述</p>
        <p className="sb-hint">{wide ? "點右邊或拖著頁角翻開" : "往左滑翻開"} →</p>
      </div>
    );
    if (s.kind === "art") { const pg = st.pages[s.i!]; return (
      <div className="sb-left">
        <figure className="sb-photo" style={{ "--tilt": `${s.i! % 2 ? 1.4 : -1.6}deg` } as React.CSSProperties}>
          <span className="sb-tape" aria-hidden="true" />
          <div className="sb-art" dangerouslySetInnerHTML={{ __html: ART[pg.art] || "" }} />
          {pg.cap && <figcaption>{pg.cap}</figcaption>}
        </figure>
        <span className="sb-no">— {s.i! + 1} —</span>
      </div>
    ); }
    if (s.kind === "text") { const pg = st.pages[s.i!]; return (
      <div className="sb-text">
        <header className="sb-head"><span className="sb-chn">第{CN[s.i!]}章</span>{pg.key && <span className="sb-key"><Icon name="tag" />{pg.key}</span>}</header>
        <h4>{pg.h}</h4>
        <p className="sb-body"><span className="sb-drop">{pg.p.slice(0, 1)}</span>{pg.p.slice(1)}</p>
        <aside className="sb-note">
          <span className="sb-seal" aria-hidden="true">註</span>
          <div><b>估價師旁註</b><p>{pg.note}</p></div>
        </aside>
      </div>
    ); }
    if (s.kind === "who") return (
      <div className="sb-left">
        <figure className="sb-photo sb-photo-who" style={{ "--tilt": "-1deg" } as React.CSSProperties}>
          <span className="sb-tape" aria-hidden="true" />
          <div className="sb-art" dangerouslySetInnerHTML={{ __html: portrait(id) }} />
          <figcaption>謝謝你聽我說完</figcaption>
        </figure>
      </div>
    );
    return (
      <div className="sb-text sb-lastp">
        <header className="sb-head"><span className="sb-chn">結語</span></header>
        <h4>估價師的話</h4>
        <blockquote className="sb-quote">{st.last}</blockquote>
        <div className="sb-btns">
          <button className="btn sm" onClick={() => onGo(st.go.href)}>{st.go.label} →</button>
          <button className="btn ghost sm" onClick={onClose}>闔上書，回到島上</button>
        </div>
        <span className="sb-fin" aria-hidden="true">讀完了</span>
      </div>
    );
  };

  /* 電腦：攤開的書＋正在翻的那一張紙 */
  const cur = spreads[at];
  let baseL = cur.l, baseR = cur.r, leaf: React.ReactNode = null;
  if (flip && wide) {
    const A = spreads[flip.from], B = spreads[flip.to], sh = Math.sin(a * Math.PI) * 0.35;
    const tr = flip.dir > 0 ? `rotateY(${-180 * a}deg)` : `rotateY(${180 * a}deg)`;
    const style = { transform: tr, transition: anim ? "transform .62s cubic-bezier(.45,.05,.35,1)" : "none" };
    if (flip.dir > 0) { baseL = A.l; baseR = B.r; leaf = <div className="sb-leaf next" style={style} onTransitionEnd={onLeafEnd}><div className="sb-face front sb-page r">{face(A.r)}<i className="sb-shade" style={{ opacity: sh }} /></div><div className="sb-face back sb-page l">{face(B.l)}<i className="sb-shade" style={{ opacity: sh }} /></div></div>; }
    else { baseL = B.l; baseR = A.r; leaf = <div className="sb-leaf prev" style={style} onTransitionEnd={onLeafEnd}><div className="sb-face front sb-page l">{face(A.l)}<i className="sb-shade" style={{ opacity: sh }} /></div><div className="sb-face back sb-page r">{face(B.r)}<i className="sb-shade" style={{ opacity: sh }} /></div></div>; }
  }
  const one = (s: Spread) => s.l.kind === "toc" ? face(s.r) : <>{face(s.l)}{face(s.r)}</>;

  return (
    <div className="sb" style={{ "--sb-c": color } as React.CSSProperties} role="dialog" aria-modal="true" aria-label={`${who}的故事：${st.title}`}>
      <div className="sb-dim" onClick={onClose} />
      <button ref={closeRef} className="sb-x" aria-label="闔上故事書" onClick={onClose}><Icon name="close" /></button>
      {wide ? (
        <div ref={bookRef} className="sb-book">
          <div className="sb-page l" onPointerDown={(e) => onPageDown(e, -1)} onPointerMove={onPageMove} onPointerUp={onPageUp}>{face(baseL)}{at > 0 && <span className="sb-ear l" aria-hidden="true" />}</div>
          <div className="sb-page r" onPointerDown={(e) => onPageDown(e, 1)} onPointerMove={onPageMove} onPointerUp={onPageUp}>{face(baseR)}{at < spreads.length - 1 && <span className="sb-ear r" aria-hidden="true" />}</div>
          {leaf}
          <div className="sb-spine" aria-hidden="true" />
        </div>
      ) : (
        <div className="sb-rail" ref={rail} onScroll={onRail}>
          {spreads.map((sp, i) => (
            <section key={i} className="sb-card" aria-hidden={i !== at} aria-label={i === 0 ? "封面" : i === spreads.length - 1 ? "結語" : `第${CN[i - 1]}章`}>{one(sp)}</section>
          ))}
        </div>
      )}
      <div className="sb-nav">
        <button aria-label="上一頁" disabled={at === 0} onClick={() => go(-1)}><Icon name="prev" /></button>
        <span className="sb-dots" aria-live="polite">{spreads.map((_, i) => <button key={i} className={i === at ? "on" : ""} aria-label={i === 0 ? "封面" : i === spreads.length - 1 ? "結語" : `第${CN[i - 1]}章`} onClick={() => turnTo(i)} />)}</span>
        <button aria-label="下一頁" disabled={at === spreads.length - 1} onClick={() => go(1)}><Icon name="next" /></button>
      </div>
    </div>
  );
}
