import { GlobalExplorer } from "@/components/GlobalExplorer";
import { LayerDaily, LayerItems, PageHero } from "@/components/LayerBlocks";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta("國際海象", "聯準會利率、新臺幣匯率、美國關稅、油價、AI 出口與地緣政治，怎麼經由資金成本、匯率與營建成本，一路傳到臺灣不動產價格。", "/global");

export default function GlobalPage() {
  return (
    <>
      <PageHero title="國際海象" badge="第 2 層・一般因素" color="var(--c-intl)">
        國際局勢不會直接出現在估價報告裡，但會透過資金成本、匯率、出口、營建成本與預期，一路流到估價師手上的參數。下面的傳導圖把這條路畫出來，卡片則逐一說明每股力量。
      </PageHero>
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container">
          <LayerDaily layer="intl" title="國際海象的最新動態" />
          <div className="section-head" style={{ marginTop: 8 }}>
            <div><h2>國際情勢怎麼傳到一塊地的價格</h2><p>由左到右四站：外部力量、傳導管道、估價參數、價格。滑過任一格會亮起它的上下游，點一下可以固定，點空白處回到全貌；每個來源下方那行字是每日觀測抓到的最新消息。</p></div>
          </div>
          <GlobalExplorer />
          <div className="section-head reveal" style={{ marginTop: 56 }}><div><h2>這一層的觀測項目</h2><p>估價師在「國際海象」這一層會看的指標。</p></div></div>
          <LayerItems layer="intl" />
        </div>
      </section>
    </>
  );
}
