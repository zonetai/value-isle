# 價值島 Value Isle｜中泰不動產智庫的市場觀測站

一塊地的價格，從四層看起：**國際海象、政策氣候、市場潮位、個別條件**。
中泰不動產智庫整理的多頁式互動網站，讓一般人用估價師的視角看市場行情、政策動態、國際局勢與個別條件。

線上版：https://zonetai.com/value-isle （經官網轉接；GitHub Pages 副本 https://zonetai.github.io/value-isle/ 標為不收錄）

## 頁面

| 頁面 | 內容 | 動畫 |
|---|---|---|
| `index.html` 島嶼 | Three.js 3D 島嶼、四層標示、觀測索引 | 島嶼浮出水面、建物長出、雲飄、貨輪繞島、路人走動、季節光影、「估價師帶路」鏡頭 |
| `daily.html` 每日觀測 | 每日快訊（附對估價的影響與出處）、專題 | 燈塔掃描、首頁跑馬燈 |
| `weather.html` 估價氣象台 | 四個儀表與本季判讀 | 指針與弧線隨季節轉動 |
| `market.html` 市場潮位 | 實價登錄：12 區單價、逐季走勢 | 潮位牆水位升降、長條生長、折線描繪 |
| `policy.html` 政策時間軸 | 2020 年起的政策事件 | 播放器依序點亮事件 |
| `global.html` 國際海象 | 六股力量與傳導路徑 | 傳導圖流動、路徑依序亮起 |
| `notes.html` 估價師手記 | 專欄、投書與論文摘要 | 卡片展開 |
| `roles.html` 我是誰 | 六種委託人路線 | 迷你島依序亮起關心的層次 |
| `drill.html` 估價小測 | 23 題分類測驗與辭典 | 翻牌、答對答錯回饋 |
| `about.html` 關於 | 整理方式、資料與知識來源、更新方式 | |

## 姊妹站：容積代金學堂（`far-payment/`）

容積移轉與容積代金的學習網站，線上版 https://zonetai.com/value-isle/far-payment/ 。九站學習路線：故事、法令、縣市、估價試算、範本、審議與找碴、標購、數據、小測。

- `far-payment/assets/data.js`：全站內容（時間軸、縣市、範本規則、題庫、辭典、示範案）
- `far-payment/assets/calc.js`：雙情境土地開發分析計算與檢核引擎（示範案數字與 114 上期末考解答檔一致）
- `far-payment/assets/scene.js`：首頁雙塔場景；`common.js`、`style.css` 為共用程式與樣式
- 新增頁面時照樣加 canonical 與 github.io 的 noindex 腳本

## 姊妹站：權變沙盤（`renewal-sandbox/`）

都市更新權利變換分配的學習與試算網站，線上版 https://zonetai.com/value-isle/renewal-sandbox/ 。四站：計算鏈、分回試算、共同負擔拆解、審查視角；首頁依地主、實施者、審查者三條路線進站。架構與分期見 `renewal-sandbox/PLAN.md`。

- `renewal-sandbox/assets/data.js`：全站內容（示範基地、燈號文字、審查清單、辭典）
- `renewal-sandbox/assets/calc.js`：A、B、C 與分回的計算引擎、三情境、敏感度、燈號、共同負擔拆解；規則庫 `RULES` 與計算分離
- `renewal-sandbox/assets/common.js`、`style.css`：共用程式與樣式，主色深青；試算輸入值以網址參數 `?s=` 分享，共同負擔以 `?b=`，帶入共負比以 `?d=`
- 示範基地是教學用區間中值組合，不對應實際案件；門檻標明「教學門檻」者非審議標準

## 更新方式

- 每日觀測：`assets/daily.js`，由每日排程自動更新（保留 45 天、60 則）
- 市場數字、政策時間軸、國際海象、季節判讀：`assets/data.js`
- 手記、小測題庫、路人小知識：`assets/knowledge.js`
- 圖示：`assets/icons.js`（自繪線條 icon）。`data.js` 的 `icon`／`ico` 欄位填這裡的名稱，例如 `ico:"bank"`；要新增圖示就在這個檔案加一筆

改完存檔、推上 `main` 即可，GitHub Pages 會自動重新發布。改了 `assets/` 裡的樣式或程式（含兩個姊妹站各自的 `assets/`），記得把各頁 `?v=` 的版本號加 1，瀏覽器才會抓新檔。

## 資料來源

- 內政部地政司 不動產交易實價查詢服務系統（政府資料開放授權條款第 1 版）
- 中央銀行、財政部、內政部、金管會公開新聞稿

本站內容為一般性資訊整理，不構成估價意見、投資或法律建議。
