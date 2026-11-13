# 價值島 Value Isle｜中泰不動產智庫的市場觀測站

一塊地的價格，從四層看起：**國際海象、政策氣候、市場潮位、個別條件**。
中泰不動產智庫整理的互動網站，讓一般人用估價師的視角看市場行情、政策動態、國際局勢與個別條件。

正式網址：https://zonetai.com/value-isle （官網把 `/value-isle/*` 轉接到這個專案在 Vercel 上的部署）

## 架構

- Next.js（App Router）＋ React，部署在 Vercel；`basePath` 是 `/value-isle`
- 每一頁的文字內容在建置時就寫進網頁（搜尋引擎與 AI 搜尋不跑 JavaScript 也讀得到）；季節切換、篩選、播放、3D 島嶼、情境推演等互動在瀏覽器端
- 舊版 `.html` 網址（例如 `daily.html#layer-ind`）一律永久轉到新網址（`/daily#layer-ind`）
- 兩個姊妹站維持靜態網頁，原樣放在 `public/` 底下，網址不變

## 主站頁面

| 網址 | 內容 |
|---|---|
| `/` 島嶼 | Three.js 3D 島嶼、四層標示、勘查手冊、「如果…」情境推演、觀測索引、估價師帶路、估價小卡 |
| `/daily` 每日觀測 | 每日快訊（附對估價的影響與出處）、專題 |
| `/weather` 估價氣象台 | 四個儀表與本季判讀 |
| `/market` 市場潮位 | 實價登錄：12 區單價、逐季走勢、季度判讀 |
| `/policy` 政策時間軸 | 2020 年起的政策事件，可播放 |
| `/global` 國際海象 | 傳導圖與六股力量的傳導路徑 |
| `/notes` 估價師手記 | 專欄、投書與論文摘要 |
| `/roles` 我是誰 | 一般委託人與專業人士的看價路線 |
| `/drill` 估價小測 | 分類測驗與辭典 |
| `/about` 關於 | 整理方式、資料與知識來源 |

## 要改主站內容，改這幾個檔

- 每日觀測與情境推演的「目前方向」：`data/daily.ts`，由每日排程自動更新（保留 45 天、60 則）。改完跑 `npm run check:daily` 檢查
- 市場數字、政策時間軸、國際海象、季節判讀、情境推演、島上勘查點、身分、辭典：`data/site.ts`
- 手記、小測題庫、路人小知識：`data/knowledge.ts`
- 圖示：`data/icons.ts`（自繪線條 icon）。`data/site.ts` 的 `icon`／`ico` 欄位填這裡的名稱，例如 `ico:"bank"`
- 3D 島嶼：`lib/island-scene.js`；樣式：`app/globals.css`
- 站內連結寫路徑，例如 `"/daily"`，網址前綴 `/value-isle` 會自動加上
- 辭典（`data/site.ts` 的 `glossary`）裡的名詞，會在各頁內文第一次出現時加上虛線「名詞小註」

改完推上 `main`，Vercel 會自動重新部署（約 1 分鐘）。

## 姊妹站：容積代金學堂（`public/far-payment/`）

容積移轉與容積代金的學習網站，線上版 https://zonetai.com/value-isle/far-payment/ 。九站學習路線：故事、法令、縣市、估價試算、範本、審議與找碴、標購、數據、小測。

- `public/far-payment/assets/data.js`：全站內容（時間軸、縣市、範本規則、題庫、辭典、示範案）
- `public/far-payment/assets/calc.js`：雙情境土地開發分析計算與檢核引擎（示範案數字與 114 上期末考解答檔一致）
- `public/far-payment/assets/scene.js`：首頁雙塔場景；`common.js`、`style.css` 為共用程式與樣式
- 新增頁面時照樣加 canonical 與 github.io 的 noindex 腳本

## 姊妹站：權變沙盤（`public/renewal-sandbox/`）

都市更新權利變換分配的學習與試算網站，線上版 https://zonetai.com/value-isle/renewal-sandbox/ 。五站：計算鏈、市價怎麼決定、分回試算、共同負擔試算、法規依據；首頁依地主、實施者、專業服務者三條路線進站。另有「十分鐘看懂權利變換」投影片導覽（`intro.html`，22 張、可自動播放、附講稿，投影片內容在該頁的 `S` 陣列）。架構與分期見 `public/renewal-sandbox/PLAN.md`。

- `public/renewal-sandbox/assets/data.js`：全站內容（示範基地、燈號文字、審查清單、辭典）
- `public/renewal-sandbox/assets/calc.js`：A、B、C 與分回的計算引擎、三情境、敏感度、燈號；規則庫 `RULES` 與計算分離
- `public/renewal-sandbox/assets/burden.js`：共同負擔案件試算引擎，`CITY` 規則庫收錄臺北市費用提列總表與工程造價要項、新北市提列基準與營建單價，換版本只改規則庫
- `public/renewal-sandbox/assets/common.js`、`style.css`：共用程式與樣式，主色深青；試算輸入值以網址參數 `?s=` 分享，共同負擔以 `?b=`，帶入共負比以 `?d=`
- 示範基地是教學用區間中值組合，不對應實際案件；門檻標明「教學門檻」者非審議標準

兩個姊妹站共用主站的線條圖示 `public/assets/icons.js`（頁面裡寫的是 `../assets/icons.js`）。改了姊妹站 `assets/` 裡的樣式或程式，記得把各頁 `?v=` 的版本號加 1，瀏覽器才會抓新檔。

## 每日自動更新

每天早上由不關機電腦上的 Claude 排程執行：搜新聞、更新 `data/daily.ts`（含情境推演的目前方向），跑 `npm run check:daily` 通過才推上 `main`。任務說明在 `docs/daily-task-prompt.md`。

## 本機開發

```bash
npm install
npm run dev        # http://localhost:3301/value-isle
npm run build      # 正式建置
npm run check:daily
```

## 資料來源

- 內政部地政司 不動產交易實價查詢服務系統（政府資料開放授權條款第 1 版）
- 中央銀行、財政部、內政部、金管會公開新聞稿
- 每日觀測：各則附原始出處

本站內容為一般性資訊整理，不構成估價意見、投資或法律建議。
