"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DATA } from "@/data/site";
import { type Season } from "@/lib/site";
import { Icon, Logo } from "./Icon";
import { useSite } from "./SiteProvider";

export function Nav() {
  const path = usePathname();
  const { season, setSeason } = useSite();
  const [open, setOpen] = useState(false);
  const links = useRef<HTMLDivElement>(null);

  /* 換頁就收起選單；點選單外面或按 Esc 也收起 */
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (links.current && !links.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <nav className="nav">
      <div className="container">
        <Link className="brand" href="/">
          <Logo className="logo" />
          <span><b>價值島</b><small>中泰不動產智庫・市場觀測站</small></span>
        </Link>
        <button
          className="nav-toggle"
          aria-label="選單"
          aria-expanded={open}
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        >
          <Icon name={open ? "close" : "menu"} />
        </button>
        <div className={open ? "nav-links open" : "nav-links"} ref={links}>
          {DATA.pages.map((p) => (
            <Link key={p.href} href={p.href} className={p.href === path ? "on" : undefined} aria-current={p.href === path ? "page" : undefined}>
              {p.label}
            </Link>
          ))}
        </div>
        <div className="season" title="切換市場季節：天色、潮位與判讀都會跟著變">
          {(Object.entries(DATA.seasons) as [Season, (typeof DATA.seasons)[Season]][]).map(([k, v]) => (
            <button key={k} data-season={k} aria-label={v.name} className={k === season ? "on" : undefined} onClick={() => setSeason(k)}>
              <span><Icon name={v.icon} /></span>{v.name}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
