"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DATA } from "@/data/site";
import { layerOf } from "@/lib/site";
import { Icon } from "./Icon";

const ROLES = DATA.roles;

/** 迷你島：選了身分後，該身分關心的層次依序亮起 */
function MiniIsle({ lit }: { lit: string[] }) {
  const on = (z: string) => (lit.includes(z) ? "zone on" : "zone");
  return (
    <svg viewBox="0 0 520 260">
      <rect width="520" height="260" fill="#cfeaf4" />
      <g className={on("policy")}><ellipse cx="120" cy="50" rx="46" ry="16" fill="#fff" /><ellipse cx="150" cy="42" rx="30" ry="18" fill="#fff" /><ellipse cx="380" cy="60" rx="40" ry="14" fill="#fff" /><text x="120" y="88" textAnchor="middle" fontSize="12" fontWeight="700" fill="#c9711a">01 政策氣候</text></g>
      <g className={on("intl")}><path d="M20 150 C 80 140, 120 160, 180 150" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="8 8" /><path d="M340 230 C 400 220, 440 240, 500 230" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="8 8" /><rect x="420" y="130" width="60" height="14" rx="3" fill="#3b4a5a" /><rect x="430" y="120" width="12" height="10" fill="#e4572e" /><rect x="446" y="120" width="12" height="10" fill="#f2c14e" /><text x="450" y="166" textAnchor="middle" fontSize="12" fontWeight="700" fill="#2a6f97">02 國際海象</text></g>
      <g className={on("market")}><rect x="40" y="130" width="22" height="90" rx="5" fill="#fff" /><rect x="44" y="170" width="14" height="46" rx="3" fill="#2b8a6e" /><text x="51" y="240" textAnchor="middle" fontSize="12" fontWeight="700" fill="#2b8a6e">03 市場潮位</text></g>
      <g className={on("ind")}><polygon points="160,200 260,230 380,200 360,160 260,140 180,160" fill="#8cc271" /><rect x="235" y="90" width="34" height="80" fill="#e9eef3" /><rect x="275" y="120" width="34" height="50" fill="#f2c9b6" /><rect x="200" y="130" width="30" height="40" fill="#d9c7a6" /><text x="270" y="250" textAnchor="middle" fontSize="12" fontWeight="700" fill="#7b4fa3">04 個別條件</text></g>
    </svg>
  );
}

function Detail({ i }: { i: number }) {
  const r = ROLES[i];
  const [lit, setLit] = useState<string[]>([]);
  useEffect(() => {
    setLit([]);
    const ts = r.layers.map((id, k) => setTimeout(() => setLit((x) => [...x, id]), 200 + k * 350));
    return () => ts.forEach(clearTimeout);
  }, [i, r.layers]);
  return (
    <>
      <div>
        <span className="kicker"><Icon name={r.ico} />{r.t}{r.group === "pro" ? " 怎麼用這座島" : " 的看價路線"}</span>
        <ol className="route">{r.steps.map((s, k) => <li key={s} data-n={k + 1}>{s}</li>)}</ol>
        <div style={{ marginTop: 10, fontSize: ".84rem", color: "var(--ink-3)" }}>{r.svc}</div>
        <div style={{ marginTop: 14, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {r.layers.map((id) => <Link key={id} className="chip" href={layerOf(id).page}>{layerOf(id).name}</Link>)}
        </div>
      </div>
      <div className="role-mini"><MiniIsle lit={lit} /></div>
    </>
  );
}

export function RoleExplorer() {
  const [on, setOn] = useState<number | null>(null);
  const roleDet = useRef<HTMLDivElement>(null), proDet = useRef<HTMLDivElement>(null), proHead = useRef<HTMLDivElement>(null);
  const isPro = on !== null && ROLES[on].group === "pro";

  /* 從首頁帶 #r2、#pro 這種錨點進來時直接選取／捲過去 */
  useEffect(() => {
    const m = location.hash.match(/^#r(\d+)$/);
    if (m && ROLES[+m[1]]) {
      const i = +m[1]; setOn(i);
      setTimeout(() => (ROLES[i].group === "pro" ? proDet : roleDet).current?.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
    } else if (location.hash === "#pro") setTimeout(() => proHead.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 200);
  }, []);

  const pick = (i: number) => {
    const next = on === i ? null : i;
    setOn(next);
    if (next !== null) setTimeout(() => (ROLES[next].group === "pro" ? proDet : roleDet).current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 50);
  };
  const card = (i: number) => {
    const r = ROLES[i];
    return (
      <div key={i} id={`r${i}`} className={on === i ? "card role-card on" : "card role-card"} onClick={() => pick(i)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(i); } }} aria-expanded={on === i}>
        <div className="ico"><Icon name={r.ico} /></div>
        <h3>{r.t}</h3>
        <p>{r.s}</p>
        <div className="layers">{r.layers.map((id) => <span key={id} className={`tag ${layerOf(id).cls}`}>{layerOf(id).name}</span>)}</div>
        <div className="svc">{r.svc}</div>
      </div>
    );
  };
  const idx = ROLES.map((_, i) => i);
  return (
    <>
      <div className="section-head" style={{ marginBottom: 16 }}><div><h2 style={{ fontSize: "1.4rem" }}>一般委託人</h2></div></div>
      <div className="role-grid" id="roleGrid">{idx.filter((i) => !ROLES[i].group).map(card)}</div>
      <div ref={roleDet} className={on !== null && !isPro ? "card role-detail open" : "card role-detail"}>{on !== null && !isPro && <Detail i={on} />}</div>
      <div className="section-head" id="pro" ref={proHead} style={{ margin: "48px 0 16px" }}>
        <div><h2 style={{ fontSize: "1.4rem" }}>專業人士</h2><p>估價師、律師、會計師、地政士、不動產經紀人員、租賃業者：工作上各自會用到這座島的哪幾層。</p></div>
      </div>
      <div className="role-grid" id="proGrid">{idx.filter((i) => ROLES[i].group === "pro").map(card)}</div>
      <div ref={proDet} className={isPro ? "card role-detail open" : "card role-detail"}>{isPro && on !== null && <Detail i={on} />}</div>
    </>
  );
}
