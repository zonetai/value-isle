"use client";

import { useEffect, useRef, useState } from "react";
import { DATA } from "@/data/site";

/** 名詞小註的解釋框：滑過、鍵盤移到、或點一下 .gl 就出現；捲動或點別處收起 */
export function GlossPop() {
  const [cur, setCur] = useState<{ i: number; x: number; y: number; above: boolean } | null>(null);
  const pop = useRef<HTMLDivElement>(null);
  const target = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const glOf = (e: Event) => ((e.target as HTMLElement)?.closest?.(".gl") as HTMLElement | null) ?? null;
    const show = (el: HTMLElement) => { target.current = el; setCur({ i: +el.dataset.g!, x: 0, y: 0, above: true }); };
    const hide = () => { target.current = null; setCur(null); };
    const over = (e: Event) => { const el = glOf(e); if (el) show(el); };
    const out = (e: Event) => { if (glOf(e)) hide(); };
    const click = (e: Event) => { const el = glOf(e); if (el) show(el); else hide(); };
    document.addEventListener("mouseover", over);
    document.addEventListener("mouseout", out);
    document.addEventListener("focusin", over);
    document.addEventListener("focusout", out);
    document.addEventListener("click", click);
    addEventListener("scroll", hide, { passive: true });
    return () => {
      document.removeEventListener("mouseover", over); document.removeEventListener("mouseout", out);
      document.removeEventListener("focusin", over); document.removeEventListener("focusout", out);
      document.removeEventListener("click", click); removeEventListener("scroll", hide);
    };
  }, []);

  /* 內容換了之後量尺寸再定位：上方放得下就放上方，左右不超出畫面 */
  useEffect(() => {
    const el = target.current, p = pop.current;
    if (!cur || !el || !p || cur.x) return;
    const r = el.getBoundingClientRect(), pw = p.offsetWidth, ph = p.offsetHeight, vw = document.documentElement.clientWidth;
    const x = Math.max(8, Math.min(r.left + r.width / 2 - pw / 2, vw - pw - 8));
    const above = r.top - ph - 8 > 64;
    setCur({ ...cur, x: x + scrollX, y: (above ? r.top - ph - 8 : r.bottom + 8) + scrollY, above });
  }, [cur]);

  const g = cur ? DATA.glossary[cur.i] : null;
  return (
    <div ref={pop} className={cur && cur.x ? "gl-pop on" : "gl-pop"} role="tooltip" style={cur ? { left: cur.x, top: cur.y } : undefined}>
      {g && <><b>{g.t}<small>名詞小註</small></b>{g.d}</>}
    </div>
  );
}
