import { G } from "@/components/Gloss";
import { LayerDaily, LayerItems, PageHero } from "@/components/LayerBlocks";
import { MarketExplorer } from "@/components/MarketExplorer";
import { DATA } from "@/data/site";
import { fmt, pageMeta, toPing } from "@/lib/site";

export const metadata = pageMeta("市場潮位", "臺北市 12 個行政區住宅大樓成交單價與 2023 年以來的逐季走勢，資料直接取自內政部實價登錄，附估價師的季度判讀。", "/market");

const M = DATA.market;

/** 全市逐季走勢：折線＝平均單價，淡色柱＝件數（相對） */
function TrendCard() {
  const q = M.quarters, W = 420, H = 300, L = 40, R = 10, T = 20, B = 50, iw = W - L - R, ih = H - T - B;
  const vals = q.map((x) => toPing(x.p));
  const mn = Math.floor(Math.min(...vals) / 5) * 5 - 5, mx = Math.ceil(Math.max(...vals) / 5) * 5 + 5;
  const maxN = Math.max(...q.map((x) => x.n));
  const X = (i: number) => L + (iw * i) / (q.length - 1), Y = (v: number) => T + ih * (1 - (v - mn) / (mx - mn));
  const grid: number[] = []; for (let v = mn; v <= mx; v += 10) grid.push(v);
  const path = vals.map((v, i) => `${i ? "L" : "M"}${X(i)} ${Y(v)}`).join(" ");
  const last = q[q.length - 1], prev = q[q.length - 2], yago = q[q.length - 5], first = q[0];
  const pct = (a: typeof last, b: typeof last) => ((toPing(a.p) / toPing(b.p) - 1) * 100).toFixed(1);
  const cls = (v: string) => (+v >= 0 ? "up" : "down"), sign = (v: string) => (+v >= 0 ? "+" : "");
  const strip: [string, string, string?][] = [
    [`${toPing(last.p)}`, `${last.q} 萬/坪`],
    [`${sign(pct(last, prev))}${pct(last, prev)}%`, "較上季", cls(pct(last, prev))],
    [`${sign(pct(last, yago))}${pct(last, yago)}%`, "較去年同季", cls(pct(last, yago))],
    [`${sign(pct(last, first))}${pct(last, first)}%`, `較 ${first.q}`, cls(pct(last, first))],
    [fmt(last.n), `${last.q} 件數（未滿季）`],
    [fmt(q.reduce((a, x) => a + x.n, 0)), "期間總件數"],
  ];
  return (
    <div className="card chart-card reveal">
      <h3>全市逐季走勢</h3>
      <p className="sub"><G>{"2023 Q1 起・住宅大樓・簡單平均單價（萬元/坪）與件數"}</G></p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="臺北市住宅大樓逐季平均單價走勢">
        {q.map((x, i) => { const bh = (ih * 0.5 * x.n) / maxN; return <rect key={x.q} x={X(i) - 7} y={T + ih - bh} width="14" height={bh} fill="#cfe3dc" rx="2"><title>{`${x.q}：${x.n} 件`}</title></rect>; })}
        {grid.map((v) => <g key={v}><line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="#eee" /><text className="ax" x={L - 6} y={Y(v) + 3} textAnchor="end">{v}</text></g>)}
        <path className="trend-line" d={path} fill="none" stroke="var(--c-market)" strokeWidth="2.5" strokeLinejoin="round" />
        {vals.map((v, i) => (
          <g key={q[i].q}>
            <circle cx={X(i)} cy={Y(v)} r="3.5" fill="#fff" stroke="var(--c-market)" strokeWidth="2" style={{ animation: "popin .4s ease both", animationDelay: `${0.3 + i * 0.12}s` }}><title>{`${q[i].q}：${v} 萬/坪，${q[i].n} 件`}</title></circle>
            {(i % 2 === 0 || i === q.length - 1) && <text className="ax" x={X(i)} y={H - B + 16} textAnchor="middle" transform={`rotate(-35 ${X(i)} ${H - B + 16})`}>{q[i].q}</text>}
          </g>
        ))}
      </svg>
      <div className="legend"><span><i style={{ background: "var(--c-market)" }} />平均單價</span><span><i style={{ background: "#cfe3dc" }} />成交件數（相對）</span></div>
      <div className="tide-strip">{strip.map(([b, t, c]) => <div key={t}><b className={c}>{b}</b><span>{t}</span></div>)}</div>
      <p className="source"><G>{"件數為該季 ZIP 主檔筆數，季度 ZIP 與旬快照合併計算；2025 Q3 筆數偏低屬資料檔切分方式所致，走勢請看相鄰季度。"}</G></p>
    </div>
  );
}

export default function MarketPage() {
  return (
    <>
      <PageHero mark="tide" title="市場潮位" badge="第 3 層・區域因素、期日修正" color="var(--c-market)">
        直接接內政部實價登錄。臺北市 12 個行政區的住宅大樓成交單價，加上 2023 年以來的逐季走勢。潮水漲到哪，一眼看得出來。
      </PageHero>
      <section className="section" style={{ paddingTop: 36 }}>
        <div className="container">
          <LayerDaily layer="market" title="市場潮位的最新動態" n={3} />
          <MarketExplorer trend={<TrendCard />} />

          <div className="section-head reveal" style={{ marginTop: 56 }}><div><h2>估價師的季度判讀</h2><p><G>{"每一季估價師都要說明市場有沒有變動，這是 2026 年各季的判讀摘要。"}</G></p></div></div>
          <div className="num-list reveal" id="qnotes" style={{ "--c": "var(--c-market)" } as React.CSSProperties}>
            {(M.quarterNotes ?? []).map((n) => <div className="card" key={n.q}><b>{n.q}</b><p><G>{n.s}</G></p></div>)}
          </div>
          <p className="source reveal">{M.quarterNoteCaveat}</p>

          <div className="section-head reveal" style={{ marginTop: 56 }}><div><h2>這一層的觀測項目</h2><p><G>{"估價師在「市場潮位」這一層會看的東西，以及它們怎麼進到估價報告。"}</G></p></div></div>
          <LayerItems layer="market" />
        </div>
      </section>
    </>
  );
}
