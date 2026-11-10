# 價值島 Value Isle｜中泰不動產智庫的市場觀測站

一塊地的價格，從四層看起：**國際海象、政策氣候、市場潮位、個別條件**。
中泰不動產智庫整理的互動網站，讓一般人用估價師的視角看市場行情、政策動態、國際局勢與個別條件。

正式網址：https://zonetai.com/value-isle （官網把 `/value-isle/*` 轉接到這個專案在 Vercel 上的部署）

## 架構

- Next.js（App Router）＋ React，部署在 Vercel；`basePath` 是 `/value-isle`
- 每一頁的文字內容在建置時就寫進網頁（搜尋引擎與 AI 搜尋不跑 JavaScript 也讀得到）；季節切換、篩選、播放、3D 島嶼等互動在瀏覽器端
- 舊版 `.html` 網址（例如 `daily.html#layer-ind`）一律永久轉到新網址（`/daily#layer-ind`）

## 頁面

| 網址 | 內容 |
|---|---|
| `/` 島嶼 | Three.js 3D 島嶼、四層標示、觀測索引、估價師帶路 |
| `/daily` 每日觀測 | 每日快訊（附對估價的影響與出處）、專題 |
| `/weather` 估價氣象台 | 四個儀表與本季判讀 |
| `/market` 市場潮位 | 實價登錄：12 區單價、逐季走勢、季度判讀 |
| `/policy` 政策時間軸 | 2020 年起的政策事件，可播放 |
| `/global` 國際海象 | 傳導圖與六股力量的傳導路徑 |
| `/notes` 估價師手記 | 專欄、投書與論文摘要 |
| `/roles` 我是誰 | 一般委託人與專業人士的看價路線 |
| `/drill` 估價小測 | 分類測驗與辭典 |
| `/about` 關於 | 整理方式、資料與知識來源 |

## 要改內容，改這幾個檔

- 每日觀測：`data/daily.ts`，由每日排程自動更新（保留 45 天、60 則）。改完可跑 `npm run check:daily` 檢查
- 市場數字、政策時間軸、國際海象、季節判讀、身分、辭典：`data/site.ts`
- 手記、小測題庫、路人小知識：`data/knowledge.ts`
- 圖示：`data/icons.ts`（自繪線條 icon）。`data/site.ts` 的 `icon`／`ico` 欄位填這裡的名稱，例如 `ico:"bank"`
- 站內連結寫路徑，例如 `"/daily"`，網址前綴 `/value-isle` 會自動加上

改完推上 `main`，Vercel 會自動重新部署（約 1 分鐘）。

## 每日自動更新

`.github/workflows/daily-news.yml` 每天臺北時間 07:20 執行：Claude 依 `.github/daily-news-prompt.md` 搜新聞、更新 `data/daily.ts`，通過型別檢查與資料檢查才推上 `main`。要調整寫法或搜尋範圍，改 `daily-news-prompt.md` 即可。也可以在 GitHub 的 Actions 頁面手動按「Run workflow」。

需要在 repo 設定一個 Secret：`ANTHROPIC_API_KEY`。

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
