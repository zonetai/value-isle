"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { STORIES } from "@/data/stories";
import { ART, portrait } from "@/data/story-art";
import { Icon } from "./Icon";

/* ============================================================
   路人的故事書：圖文、翻頁。
   電腦上是一本攤開的書（左頁插圖、右頁文字），翻頁時右頁像紙一樣翻過去；
   手機上一次一頁，翻頁時整頁轉過去。← → 鍵、滑動、點兩側都可以翻；Esc 關閉。
   ============================================================ */
type Side = { kind: "end" | "cover" | "art" | "text" | "last" | "who"; i?: number };
type Spread = { l: Side; r: Side };

export function StoryBook({ id, who, color, onClose, onGo }: { id: string; who: string; color: string; onClose: () => void; onGo: (href: string) => void }) {
  const st = STORIES[id];
  const spreads: Spread[] = st ? [{ l: { kind: "end" }, r: { kind: "cover" } }, ...st.pages.map((_, i) => ({ l: { kind: "art" as const, i }, r: { kind: "text" as const, i } })), { l: { kind: "who" }, r: { kind: "last" } }] : [];
  const [at, setAt] = useState(0);
  const [flip, setFlip] = useState<{ dir: 1 | -1; from: number; to: number } | null>(null);
  const [wide, setWide] = useState(true);
  const busy = useRef(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { const m = window.matchMedia("(min-width: 760px)"); const f = () => setWide(m.matches); f(); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, []);
  useEffect(() => { closeRef.current?.focus(); document.documentElement.classList.add("sb-open"); return () => document.documentElement.classList.remove("sb-open"); }, []);

  const go = useCallback((dir: 1 | -1) => {
    if (busy.current) return;
    const to = at + dir; if (to < 0 || to >= spreads.length) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setAt(to); return; }
    busy.current = true; setFlip({ dir, from: at, to });
    setTimeout(() => { setAt(to); setFlip(null); busy.current = false; }, 720);
  }, [at, spreads.length]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); else if (e.key === "ArrowRight") go(1); else if (e.key === "ArrowLeft") go(-1); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [go, onClose]);

  /* 滑動翻頁 */
  const sx = useRef<number | null>(null);
  const onDown = (e: React.PointerEvent) => { if ((e.target as HTMLElement).closest("button,a")) return; sx.current = e.clientX; };
  const onUp = (e: React.PointerEvent) => { if (sx.current === null) return; const d = e.clientX - sx.current; sx.current = null; if (Math.abs(d) > 40) go(d < 0 ? 1 : -1); };

  if (!st) return null;
  const n = st.pages.length;

  const face = (s: Side) => {
    if (s.kind === "end") return (
      <div className="sb-end"><span className="sb-end-mark">價值島<br /><small>路人的故事</small></span></div>
    );
    if (s.kind === "cover") return (
      <div className="sb-cover">
        <small className="sb-kick">{who}的故事</small>
        <h3>{st.title}</h3>
        <div className="sb-art sb-portrait" dangerouslySetInnerHTML={{ __html: portrait(id) }} />
        <p className="sb-hint">翻開來看看他們心裡在想什麼 →</p>
      </div>
    );
    if (s.kind === "art") return (
      <div className="sb-left">
        <div className="sb-art" dangerouslySetInnerHTML={{ __html: ART[st.pages[s.i!].art] || "" }} />
        <span className="sb-no">{s.i! + 1} / {n}</span>
      </div>
    );
    if (s.kind === "text") { const pg = st.pages[s.i!]; return (
      <div className="sb-text">
        <small className="sb-ch">第 {s.i! + 1} 章</small>
        <h4>{pg.h}</h4>
        <p>{pg.p}</p>
        <aside className="sb-note"><b>估價師旁註</b>{pg.note}</aside>
      </div>
    ); }
    if (s.kind === "who") return (
      <div className="sb-left"><div className="sb-art sb-portrait" dangerouslySetInnerHTML={{ __html: portrait(id) }} /><span className="sb-no">完</span></div>
    );
    return (
      <div className="sb-text sb-lastp">
        <small className="sb-ch">估價師的話</small>
        <p className="sb-quote">「{st.last}」</p>
        <div className="sb-btns">
          <button className="btn sm" onClick={() => onGo(st.go.href)}>{st.go.label} →</button>
          <button className="btn ghost sm" onClick={onClose}>讀完了，回到島上</button>
        </div>
      </div>
    );
  };

  /* 電腦：攤開的書＋翻頁的那一張紙 */
  const cur = spreads[at];
  let baseL = cur.l, baseR = cur.r, leaf: React.ReactNode = null;
  if (flip && wide) {
    const A = spreads[flip.from], B = spreads[flip.to];
    if (flip.dir > 0) { baseL = A.l; baseR = B.r; leaf = <div className="sb-leaf next"><div className="sb-face front sb-page r">{face(A.r)}</div><div className="sb-face back sb-page l">{face(B.l)}</div></div>; }
    else { baseL = B.l; baseR = A.r; leaf = <div className="sb-leaf prev"><div className="sb-face front sb-page l">{face(A.l)}</div><div className="sb-face back sb-page r">{face(B.r)}</div></div>; }
  }
  /* 手機：一次一頁，翻的時候整頁轉過去 */
  const one = (s: Spread) => s.l.kind === "end" ? face(s.r) : s.l.kind === "who" ? <>{face(s.l)}{face(s.r)}</> : <>{face(s.l)}{face(s.r)}</>;

  return (
    <div className="sb" style={{ "--sb-c": color } as React.CSSProperties} role="dialog" aria-modal="true" aria-label={`${who}的故事：${st.title}`} onPointerDown={onDown} onPointerUp={onUp}>
      <div className="sb-dim" onClick={onClose} />
      <button ref={closeRef} className="sb-x" aria-label="闔上故事書" onClick={onClose}><Icon name="close" /></button>
      {wide ? (
        <div className={`sb-book${at === 0 && !flip ? " closed" : ""}`}>
          <div className="sb-page l" onClick={() => go(-1)}>{face(baseL)}</div>
          <div className="sb-page r" onClick={(e) => { if (!(e.target as HTMLElement).closest("button")) go(1); }}>{face(baseR)}</div>
          {leaf}
          <div className="sb-spine" aria-hidden="true" />
        </div>
      ) : (
        <div className="sb-mobile">
          <div key={flip ? `f${flip.to}` : `a${at}`} className={`sb-sheet${flip ? (flip.dir > 0 ? " turn-next" : " turn-prev") : ""}`}>{one(spreads[flip ? flip.to : at])}</div>
        </div>
      )}
      <div className="sb-nav">
        <button aria-label="上一頁" disabled={at === 0} onClick={() => go(-1)}><Icon name="prev" /></button>
        <span className="sb-dots" aria-live="polite">{spreads.map((_, i) => <i key={i} className={i === at ? "on" : ""} />)}</span>
        <button aria-label="下一頁" disabled={at === spreads.length - 1} onClick={() => go(1)}><Icon name="next" /></button>
      </div>
    </div>
  );
}
