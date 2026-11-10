"use client";

import { Fragment, useEffect, useState } from "react";
import { DATA } from "@/data/site";
import { fmt, toPing } from "@/lib/site";

const M = DATA.market;
type District = { d: string; n: number; p: number };
const maxP = Math.max(...M.districts.map((x) => toPing(x.p)));
const totalN = M.districts.reduce((a, x) => a + x.n, 0);
const ALL: District = { d: "臺北市 12 區平均", n: totalN, p: M.districts.reduce((a, x) => a + x.p * x.n, 0) / totalN };

/** 潮位牆＋各區長條：點行政區或長條，潮位跟著換；長條可依單價、件數、區名排序。trend 是右邊的逐季走勢卡 */
export function MarketExplorer({ trend }: { trend: React.ReactNode }) {
  const [cur, setCur] = useState<District | null>(null);
  const [sort, setSort] = useState<"price" | "count" | "name">("price");
  const [grown, setGrown] = useState(false);

  useEffect(() => { const t = setTimeout(() => setCur(ALL), 300); return () => clearTimeout(t); }, []);
  useEffect(() => { setGrown(false); const r = requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true))); return () => cancelAnimationFrame(r); }, [sort]);

  const v = cur ? toPing(cur.p) : 0;
  const data = [...M.districts];
  if (sort === "price") data.sort((a, b) => b.p - a.p);
  if (sort === "count") data.sort((a, b) => b.n - a.n);
  if (sort === "name") data.sort((a, b) => a.d.localeCompare(b.d, "zh-Hant"));
  const W = 640, H = 420, L = 70, R = 60, T = 10, rowH = (H - T - 20) / data.length;
  const max = maxP * 1.08, maxN = Math.max(...data.map((x) => x.n));

  return (
    <>
      <div className="tide-wall">
        <div className="card tide-vis reveal" id="tideVis">
          <div className="water" style={cur ? { height: Math.max(8, (v / maxP) * 100) + "%" } : undefined} />
          <div className="ruler">
            {[0, 25, 50, 75, 100].map((pc) => (
              <Fragment key={pc}>
                <i style={{ bottom: pc + "%" }} />
                <span style={{ bottom: pc + "%" }}>{Math.round((maxP * pc) / 100)}</span>
              </Fragment>
            ))}
          </div>
          <div className="readout">
            <small>{cur ? cur.d : "臺北市平均"}</small>
            <b>{cur ? `${v} 萬/坪` : "—"}</b>
            <small>{cur ? `${fmt(cur.n)} 件・相對最高區 ${Math.round((v / maxP) * 100)}%` : ""}</small>
          </div>
        </div>
        <div className="card reveal">
          <h3 style={{ margin: "6px 0 4px" }}>點一個行政區，看它的潮位</h3>
          <p style={{ fontSize: ".84rem", color: "var(--ink-3)", margin: "0 0 12px" }}>近一年住宅大樓成交單價（萬元/坪）與件數；水位高低以最高區為滿水位。</p>
          <div className="district-grid" id="districtGrid">
            {[ALL, ...M.districts].map((x) => (
              <button key={x.d} className={cur?.d === x.d ? "on" : undefined} onClick={() => setCur(x)}>
                <b>{x.d}</b><small>{toPing(x.p)} 萬/坪・{x.n} 件</small>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="section-head reveal" style={{ marginTop: 36 }}>
        <div><h2>各區成交單價</h2><p>長條顏色深淺代表件數多寡。</p></div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {([["price", "依單價"], ["count", "依件數"], ["name", "依區名"]] as const).map(([k, t]) => (
            <button key={k} className={sort === k ? "chip on" : "chip"} onClick={() => setSort(k)}>{t}</button>
          ))}
        </div>
      </div>
      <div className="charts">
        <div className="card chart-card reveal">
          <h3>臺北市各區住宅大樓成交單價</h3>
          <p className="sub">近一年・房地交易・簡單平均・萬元/坪</p>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="臺北市各區住宅大樓成交單價長條圖">
            {data.map((x, i) => {
              const y = T + i * rowH, pv = toPing(x.p), w = ((W - L - R) * pv) / max, alpha = 0.45 + 0.55 * (x.n / maxN);
              return (
                <g key={x.d}>
                  <text className="lbl" x={L - 8} y={y + rowH * 0.62} textAnchor="end">{x.d}</text>
                  <rect className="bar-rect" x={L} y={y + 4} width={grown ? w : 0} height={rowH - 8} rx="6" fill="var(--c-market)" opacity={alpha.toFixed(2)} style={{ cursor: "pointer", transitionDelay: `${i * 50}ms` }} onClick={() => setCur(x)}>
                    <title>{`${x.d}：${pv} 萬/坪，${x.n} 件`}</title>
                  </rect>
                  <text className="val" x={L + w + 6} y={y + rowH * 0.62}>{pv}</text>
                  <text className="ax" x={W - 4} y={y + rowH * 0.62} textAnchor="end">{x.n} 件</text>
                </g>
              );
            })}
          </svg>
          <p className="source">資料：內政部不動產交易實價查詢服務系統，期間 {M.period}，建物型態「住宅大樓」、交易標的含房地、單價&gt;0，依鄉鎮市區簡單平均；顏色深淺代表件數多寡。實價登錄統計整理至 {DATA.asOf}。</p>
        </div>
        {trend}
      </div>
    </>
  );
}
