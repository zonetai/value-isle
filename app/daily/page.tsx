import { G } from "@/components/Gloss";
import { DailyView } from "@/components/DailyView";
import { HeroWave } from "@/components/LayerBlocks";
import { DAILY } from "@/data/daily";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta("每日觀測", "每天早上整理影響不動產價格的國際、政策、市場與個案新聞，每則附原始出處與「對估價的影響」；只整理、不預測，也不評論哪一方好壞。", "/daily");

export default function DailyPage() {
  return (
    <>
      <section className="page-hero daily-hero">
        <div className="container daily-hero-grid">
          <div>
            <span className="kicker">燈塔日誌</span>
            <h1>每日觀測</h1>
            <p><G>{"這裡是四層動態的總覽。同樣的內容也會出現在各自的頁面：政策的進「政策」頁並接上時間軸，國際的進「國際」頁，市場的進「市場潮位」頁；個案層級的動態留在這裡。每則附「對估價的影響」與原始出處；只整理、不預測，也不評論哪一方好壞。"}</G></p>
            <div className="daily-meta">
              <span className="live"><i />更新至 <b>{DAILY.updated}</b></span>
              <span>{DAILY.schedule}</span>
              <span>{DAILY.briefs.length} 則快訊・{DAILY.topics.length} 個專題</span>
            </div>
          </div>
          <svg className="lh" viewBox="0 0 220 200" aria-hidden="true">
            <g className="lh-beam"><polygon points="110,62 -40,20 -40,104" fill="#f2c14e" opacity=".35" /><polygon points="110,62 260,20 260,104" fill="#f2c14e" opacity=".2" /></g>
            <path d="M40 186 Q110 150 180 186 Z" fill="#7fbf63" />
            <polygon points="92,176 128,176 121,74 99,74" fill="#faf6ea" />
            <polygon points="94.5,150 125.5,150 124,128 96,128" fill="#e4572e" /><polygon points="97.5,104 122.5,104 121.3,86 98.7,86" fill="#e4572e" />
            <rect x="95" y="68" width="30" height="6" fill="#3b4a5a" /><rect x="102" y="52" width="16" height="16" fill="#fff1c0" /><polygon points="98,52 122,52 110,38" fill="#3b4a5a" />
            <path className="lh-wave" d="M0 190 Q 20 182 40 190 T 80 190 T 120 190 T 160 190 T 200 190 T 240 190" fill="none" stroke="#2f8fb4" strokeWidth="3" />
          </svg>
        </div>
        <HeroWave />
      </section>
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container">
          <DailyView />
          <p className="disclaimer" style={{ marginTop: 28 }}>
            本頁為公開資訊的中立整理，每則附原始出處，內容以出處為準。選舉相關內容依議題列出各方公開主張，不預測選情、不代表任何立場；「對估價的影響」是一般性說明，不構成估價意見或投資建議。發現錯誤請以出處為準並告知更正。
          </p>
        </div>
      </section>
    </>
  );
}
