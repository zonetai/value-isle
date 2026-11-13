"use client";

import { useEffect, useState } from "react";
import { DATA } from "@/data/site";
import { type Season } from "@/lib/site";
import { G } from "./Gloss";
import { Icon } from "./Icon";
import { useSite } from "./SiteProvider";

const SEASONS = Object.entries(DATA.seasons) as [Season, (typeof DATA.seasons)[Season]][];

/** 氣象台頁首的季節選擇器 */
export function SeasonPicker() {
  const { season, setSeason } = useSite();
  return (
    <div className="season-picker" id="seasonPicker" style={{ marginTop: 24 }}>
      {SEASONS.map(([k, v]) => (
        <button key={k} data-season={k} className={k === season ? "on" : undefined} onClick={() => setSeason(k)}>
          <b><Icon name={v.icon} />{v.name}</b>
          <small>{v.verdict.split("。")[0]}。</small>
        </button>
      ))}
    </div>
  );
}

/** 本季判讀標題與內文 */
export function VerdictText() {
  const { season } = useSite();
  const S = DATA.seasons[season];
  return (
    <>
      <h3 id="verdictTitle">本季判讀：<Icon name={S.icon} />{S.name}</h3>
      <p id="verdictText"><G>{S.verdict}</G></p>
    </>
  );
}

const Dial = ({ v }: { v: number | null }) => (
  <svg viewBox="0 0 140 140">
    <path d="M14 70 A56 56 0 0 1 126 70" fill="none" stroke="var(--line)" strokeWidth="12" strokeLinecap="round" />
    <path className="arc" d="M14 70 A56 56 0 0 1 126 70" fill="none" stroke="var(--c)" strokeWidth="12" strokeLinecap="round" strokeDasharray="176" strokeDashoffset={v === null ? 176 : 176 - (176 * v) / 100} style={{ transition: "stroke-dashoffset 1.2s ease" }} />
    <g className="needle" style={{ transform: `rotate(${v === null ? -90 : -90 + v * 1.8}deg)` }}>
      <line x1="70" y1="70" x2="70" y2="22" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="70" cy="70" r="6" fill="var(--ink)" />
    </g>
  </svg>
);

/** 四個儀表：指針與弧線隨季節轉動；點一下打開該層的抽屜 */
export function Gauges() {
  const { season, openDrawer } = useSite();
  const target = DATA.seasons[season].gauges;
  const [vals, setVals] = useState<readonly number[] | null>(null);
  useEffect(() => { const t = setTimeout(() => setVals(target), 50); return () => clearTimeout(t); }, [target]);
  return (
    <div className="board" id="board">
      {DATA.gauges.map((g, i) => {
        const v = target[i];
        return (
          <div key={g.id} className="card gauge reveal" style={{ "--c": g.color } as React.CSSProperties} onClick={() => openDrawer(g.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") openDrawer(g.id); }}>
            <div className="ico"><Icon name={g.ico} /></div>
            <h3>{g.name}</h3>
            <span className="state">{g.states[v < 40 ? 0 : v < 65 ? 1 : 2]}</span>
            <div className="dial"><Dial v={vals ? vals[i] : null} /></div>
            <div className="scale"><span>{g.lo}</span><span>{g.hi}</span></div>
            <p><G>{g.text}</G></p>
          </div>
        );
      })}
    </div>
  );
}
