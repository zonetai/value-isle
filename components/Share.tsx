"use client";
import { useEffect, useRef, useState } from "react";
import { SITE_URL, BASE } from "@/lib/site";
import { Icon } from "./Icon";
import { useSite } from "./SiteProvider";

/* ============================================================
   分享：手機上用系統的分享選單（LINE、訊息都在裡面）；
   電腦或不支援的瀏覽器跳出小選單：複製連結、分享到 LINE、分享到 Facebook。
   網址一律用 zonetai.com/value-isle 的正式網址，不帶任何個人資料。
   ============================================================ */
export function pageUrl() {
  if (typeof window === "undefined") return SITE_URL;
  const p = window.location.pathname.replace(/\.html$/, "").replace(/\/$/, "");
  const sub = p.startsWith(BASE) ? p.slice(BASE.length) : p;
  return SITE_URL + sub + window.location.hash;
}

export async function copyText(t: string) {
  try { await navigator.clipboard.writeText(t); return true; }
  catch {
    try { const a = document.createElement("textarea"); a.value = t; a.style.position = "fixed"; a.style.opacity = "0"; document.body.appendChild(a); a.select(); const ok = document.execCommand("copy"); a.remove(); return ok; }
    catch { return false; }
  }
}

export function ShareButton({ title = "價值島", text, className = "", label = "分享" }: { title?: string; text?: string; className?: string; label?: string }) {
  const { toast } = useSite();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", off); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("click", off); document.removeEventListener("keydown", esc); };
  }, [open]);

  const go = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = pageUrl();
    const touch = window.matchMedia("(pointer:coarse)").matches;
    if (touch && navigator.share) {
      try { await navigator.share({ title, text: text || "一塊地的價格，從四層看起。中泰不動產智庫的市場觀測站。", url }); } catch { /* 使用者取消 */ }
      return;
    }
    setOpen(!open);
  };
  const url = typeof window === "undefined" ? SITE_URL : pageUrl();
  const enc = encodeURIComponent(url);
  return (
    <span className={`share ${className}`} ref={box}>
      <button className="share-btn" onClick={go} aria-haspopup="menu" aria-expanded={open} aria-label={label}>
        <Icon name="share" /><span className="share-t">{label}</span>
      </button>
      {open && (
        <span className="share-menu" role="menu">
          <button role="menuitem" onClick={async () => { const ok = await copyText((text ? text + " " : "") + url); toast(ok ? "已複製連結，可以貼到 LINE 或任何地方。" : "複製失敗，請直接複製網址列。"); setOpen(false); }}>
            <Icon name="copy" />複製連結
          </button>
          <a role="menuitem" href={`https://social-plugins.line.me/lineit/share?url=${enc}`} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
            <span className="share-line" aria-hidden="true">LINE</span>分享到 LINE
          </a>
          <a role="menuitem" href={`https://www.facebook.com/sharer/sharer.php?u=${enc}`} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
            <span className="share-fb" aria-hidden="true">f</span>分享到 Facebook
          </a>
        </span>
      )}
    </span>
  );
}
