import Link from "next/link";
import { DATA } from "@/data/site";
import { dataAsOf } from "@/lib/site";

export function Footer() {
  return (
    <footer>
      <div className="container">
        <div>
          <b>價值島 Value Isle</b>
          <p style={{ margin: "0 0 8px" }}>
            由中泰不動產智庫整理的市場觀測站。市場行情、政策動態、國際局勢、個別條件，四層一起看。本站內容為一般性資訊整理，不構成估價意見、投資或法律建議；個案估價請委託不動產估價師出具報告。
          </p>
          <p style={{ margin: 0 }}>{DATA.brand}</p>
        </div>
        <div>
          <b>資料來源</b>
          <ul>
            <li>內政部地政司 不動產交易實價查詢服務系統（政府資料開放授權條款第 1 版）</li>
            <li>中央銀行、財政部、內政部、金管會公開新聞稿</li>
            <li>每日觀測：各則附原始出處</li>
            <li>資料整理至 {dataAsOf()}</li>
          </ul>
        </div>
        <div>
          <b>站內頁面</b>
          <ul>
            {DATA.pages.map((p) => (
              <li key={p.href}><Link href={p.href}>{p.label}</Link></li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
