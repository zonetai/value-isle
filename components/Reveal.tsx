"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * 捲動到畫面裡才淡入（.reveal → .reveal.in）。每次換頁、以及頁面內容變動（篩選、切換）後重新掃一次。
 * 沒有 JavaScript 時 html 上的 .no-js 讓內容直接顯示。
 */
export function Reveal() {
  const path = usePathname();
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { threshold: 0.08 },
    );
    const scan = () => document.querySelectorAll(".reveal:not(.in)").forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, [path]);
  return null;
}
