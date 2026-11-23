import { G } from "@/components/Gloss";
import { PageHero } from "@/components/LayerBlocks";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta("關於本站", "價值島是中泰不動產智庫整理的市場觀測站：把估價師看價格的方法攤開來，先看海、看天、看潮，最後才拿尺量這塊地。", "/about");

export default function AboutPage() {
  return (
    <>
      <PageHero mark="isle" title="關於價值島">
        一個由中泰不動產智庫整理的市場觀測站。目的不是報明牌，而是把估價師看價格的方法攤開來：先看海、看天、看潮，最後才拿尺量這塊地。
      </PageHero>
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container" style={{ maxWidth: 900 }}>
          <div className="card reveal">
            <h3>整理方式</h3>
            <p><G>{"價格由四層力量決定，對應估價學的一般因素（國際海象、政策氣候）、區域因素與期日修正（市場潮位）、個別因素（個別條件）。每一個觀測項目都附「對估價的影響」，說明它怎麼進到估價報告，不評價政策好壞。"}</G></p>
            <h3 style={{ marginTop: 18 }}>資料來源</h3>
            <ul>
              <li><G>{"市場潮位：內政部地政司不動產交易實價查詢服務系統（政府資料開放授權條款第 1 版）。統計口徑為臺北市住宅大樓、房地交易、單價大於零、依鄉鎮市區簡單平均，未剔除特殊交易，只適合看趨勢。"}</G></li>
              <li><G>{"政策時間軸：中央銀行、財政部、內政部、金管會公開新聞稿與法規。"}</G></li>
              <li><G>{"國際海象：聯準會、中央銀行與主要媒體的公開報導。"}</G></li>
            </ul>
            <h3 style={{ marginTop: 18 }}>知識來源</h3>
            <ul>
              <li><G>{"政策時間軸與國際海象（2025 年起）、季度判讀：估價師每月更新的一般因素分析與每季價格變動說明。"}</G></li>
              <li><G>{"估價師手記：估價師發表過的專欄、投書與論文摘要。"}</G></li>
              <li><G>{"每日觀測：每天早上自動整理公開新聞，每則附出處；選舉相關內容依議題列出各方公開主張，不預測、不評論。"}</G></li>
              <li><G>{"以上全部改寫為一般讀者語言，不含任何個案的當事人、地址或金額。"}</G></li>
            </ul>
            <h3 style={{ marginTop: 18 }}>注意事項</h3>
            <ul>
              <li><G>{"估價氣象台的儀表是依「市場季節」設定的示意判讀，不是量化指標。"}</G></li>
              <li><G>{"本站內容不構成估價意見、投資或法律建議；個案估價請委託不動產估價師出具報告。"}</G></li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
