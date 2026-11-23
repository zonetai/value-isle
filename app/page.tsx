import { G } from "@/components/Gloss";
import Link from "next/link";
import { FactDeck } from "@/components/FactDeck";
import { FlowChain } from "@/components/FlowChain";
import { IslandHero } from "@/components/IslandHero";
import { LAYER_ART } from "@/components/layerArt";
import { VerdictText } from "@/components/SeasonParts";
import { DATA } from "@/data/site";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta(null, "一塊地的價格，從四層看起：國際海象、政策氣候、市場潮位、個別條件。中泰不動產智庫整理的互動式市場觀測站，附每日觀測與估價師判讀。", "/");

export default function HomePage() {
  return (
    <>
      <IslandHero />

      {/* 四層概覽 */}
      <section className="section">
        <div className="container">
          <div className="section-head reveal">
            <div><h2>四層力量，各有一頁</h2><p><G>{"每一層都整理成獨立頁面：資料、動畫、以及「對估價的影響」。"}</G></p></div>
            <Link className="btn ghost" href="/weather">先看今天的估價氣象</Link>
          </div>
          <div className="layer-cards" id="layerCards">
            {DATA.layers.map((l) => (
              <Link key={l.id} className="card layer-card reveal" href={l.page} style={{ "--c": l.color } as React.CSSProperties}>
                <div className="lc-art">
                  <svg viewBox="0 0 240 84" preserveAspectRatio="xMidYMid slice" aria-hidden="true" dangerouslySetInnerHTML={{ __html: LAYER_ART[l.id] ?? "" }} />
                </div>
                <div className="lc-body">
                  <span className="n">{l.n}</span>
                  <h3>{l.name}</h3>
                  <p>{l.desc}</p>
                  <div className="go">{l.page.startsWith("/daily") ? "看最新動態" : l.items.length + " 個觀測項目"}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 本季判讀 */}
      <section className="section">
        <div className="container">
          <div className="verdict reveal">
            <div className="card">
              <VerdictText />
              <FlowChain />
            </div>
            <div className="card">
              <h3>估價師怎麼用這座島</h3>
              <p style={{ fontSize: ".92rem" }}>前三層決定「這個區域、這個時點」的大水位，是比較法裡的<b>期日修正</b>與<b>區域因素</b>；最後一層才是<b>個別因素</b>。同一條街、同一棟樓，差一個條件就差一個調整率。所以估價師先看海、看天、看潮，最後才拿尺量這塊地。</p>
              <div style={{ marginTop: 10 }}><span className="tag intl">一般因素</span><span className="tag policy">一般因素</span><span className="tag market">區域因素</span><span className="tag ind">個別因素</span></div>
            </div>
          </div>

          {/* 估價小卡：一次一句，可以一直換 */}
          <FactDeck />
        </div>
      </section>
    </>
  );
}
