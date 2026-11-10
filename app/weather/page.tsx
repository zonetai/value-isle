import Link from "next/link";
import { FlowChain } from "@/components/FlowChain";
import { Gauges, SeasonPicker, VerdictText } from "@/components/SeasonParts";
import { DATA } from "@/data/site";
import { DAILY } from "@/data/daily";
import { md, pageMeta } from "@/lib/site";

export const metadata = pageMeta("估價氣象台", "四個儀表對應估價師每天在看的四股力量：資金活水、政策氣壓、市場潮位、條件分化。選一個市場季節，看指針與判讀怎麼變。", "/weather");

/** 四層各自最新的一則每日觀測 */
function DailyStrip() {
  const order = ["intl", "policy", "market", "ind"];
  return (
    <div className="daily-strip" id="dailyStrip">
      <div className="ds-head"><i className="ld-live" />最新觀測 · 更新至 {DAILY.updated}</div>
      {order.map((id) => {
        const L = DATA.layers.find((l) => l.id === id)!;
        const list = DAILY.briefs.filter((b) => b.layer === id);
        const latest = list[0];
        return (
          <Link key={id} className="card" href={L.page.includes("#") ? L.page : L.page + "#layerDaily"} style={{ "--c": L.hex } as React.CSSProperties}>
            <span className={`tag ${L.cls}`}>{L.name}</span>
            <b>{latest ? latest.t : "近期沒有新動態"}</b>
            <small>{latest ? `${md(latest.d)}・共 ${list.length} 則` : ""}</small>
          </Link>
        );
      })}
    </div>
  );
}

export default function WeatherPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>估價氣象台</h1>
          <p>四個儀表，對應估價師每天在看的四股力量。選一個「市場季節」，指針、天色與判讀會一起換。</p>
          <SeasonPicker />
        </div>
      </section>
      <section className="section" style={{ paddingTop: 36 }}>
        <div className="container">
          <Gauges />
          <DailyStrip />
          <div className="verdict">
            <div className="card reveal">
              <VerdictText />
              <FlowChain />
            </div>
            <div className="card reveal">
              <h3>怎麼讀這四個儀表</h3>
              <p style={{ fontSize: ".92rem" }}>「資金活水」與「政策氣壓」是一般因素，決定需求曲線的位置；「市場潮位」是區域因素與期日修正，決定比較法案例的水位；「條件分化」提醒估價師這一季要在個別因素上花多少篇幅。四個儀表都偏右時，是最容易做出過度樂觀估值的季節。</p>
              <p className="disclaimer">儀表數值為依季節設定的示意判讀，不是量化指標；更新季節判讀請改 data/site.ts 的 seasons。</p>
            </div>
          </div>
          <div className="card reveal" style={{ marginTop: 18 }}>
            <h3 style={{ fontFamily: "var(--serif)", fontSize: "1.3rem", fontWeight: 900, margin: "6px 0" }}>估價師每個月怎麼看一般因素</h3>
            <p style={{ fontSize: ".95rem", color: "var(--ink-2)" }}>{DATA.macroMethod}</p>
          </div>
        </div>
      </section>
    </>
  );
}
