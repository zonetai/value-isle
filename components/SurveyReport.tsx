"use client";
import { useEffect, useRef, useState } from "react";
import { REPORTS } from "@/data/reports";
import { G } from "./Gloss";
import { Icon } from "./Icon";

/* ============================================================
   建物的「勘查報告」：島上每一處建物或觀測點打開來是一份報告。
   抬頭（勘查紀錄編號、所屬的層、勘查日）→ 左邊現場示意圖（點編號看說明）→
   右邊：一、現場看到　二、估價怎麼調整（調整表）＋主要方法 → 三、估價師說明 → 頁尾蓋章。
   ============================================================ */
const DIR = { up: ["↑", "加分"], down: ["↓", "扣分"], eq: ["＝", "視情況"] } as const;

export function SurveyReport({ id, no, name, layer, layerCls, see, adj, stamp, onClose, extra, foot }: {
  id: string; no: number; name: string; layer: string; layerCls: string; see: string; adj: string; stamp: boolean;
  onClose: () => void; extra?: React.ReactNode; foot: React.ReactNode;
}) {
  const r = REPORTS[id];
  const [act, setAct] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const box = ref.current?.closest(".scene-card"); if (box) box.scrollTop = 0; }, [id]);
  const d = new Date(), date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  return (
    <div className="rp" ref={ref}>
      <header className="rp-top">
        <span className="rp-no">勘查紀錄 No.{String(no).padStart(2, "0")}</span>
        <span className={`tag ${layerCls}`}>{layer}</span>
        <span className="rp-date">勘查日 {date}</span>
        <button className="rp-x" aria-label="闔上報告" onClick={onClose}><Icon name="close" /></button>
      </header>
      <div className="rp-body">
        {r && (
          <figure className="rp-fig">
            <svg viewBox="0 0 300 200" role="img" aria-label={`${name}的現場示意圖`}>
              <g dangerouslySetInnerHTML={{ __html: r.art }} />
              {r.marks.map(([x, y], i) => (
                <g key={i} className={act === i ? "rp-mk on" : "rp-mk"} transform={`translate(${x} ${y})`} onClick={() => setAct(act === i ? null : i)} role="button" tabIndex={0} aria-label={r.marks[i][2]}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAct(act === i ? null : i); } }}>
                  <circle r="11" className="rp-mk-ring" />
                  <circle r="8.5" className="rp-mk-dot" />
                  <text y="3.6" textAnchor="middle">{i + 1}</text>
                </g>
              ))}
            </svg>
            <figcaption>
              <ol className="rp-legend">
                {r.marks.map(([, , t, tip], i) => (
                  <li key={i} className={act === i ? "on" : ""}>
                    <button onClick={() => setAct(act === i ? null : i)}><i>{i + 1}</i><b>{t}</b></button>
                    {act === i && <p>{tip}</p>}
                  </li>
                ))}
              </ol>
              {act === null && <small className="rp-hint">點圖上的編號，看每一處的說明</small>}
            </figcaption>
          </figure>
        )}
        <div className="rp-main">
          <small className="rp-k">勘查標的</small>
          <h4>{name}</h4>
          <p className="rp-sum"><G>{see}</G></p>
          {r && (
            <>
              <h5><span>一</span>現場看到</h5>
              <ul className="rp-checks">{r.checks.map((x) => <li key={x}><Icon name="check" />{x}</li>)}</ul>
              <h5><span>二</span>估價怎麼調整</h5>
              <table className="rp-adj">
                <tbody>
                  {r.adj.map(([f, dir, t]) => (
                    <tr key={f}><th>{f}</th><td><em className={`rp-d ${dir}`}>{DIR[dir][0]} {DIR[dir][1]}</em></td><td>{t}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="rp-method"><b>主要方法</b>{r.method}</p>
            </>
          )}
        </div>
      </div>
      <section className="rp-note">
        <h5><span>三</span>估價師說明</h5>
        <p><G>{adj}</G></p>
      </section>
      {extra}
      <footer className="rp-foot">
        <span className={stamp ? "rp-stamp fresh" : "rp-stamp"} aria-label="已勘查">已勘查<small>{date}</small></span>
        <div className="rp-acts">{foot}</div>
      </footer>
    </div>
  );
}
