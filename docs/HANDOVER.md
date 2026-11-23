# 價值島改版交接（給所長的 Claude Code）

> 撰寫：宗淳（2026-11-23）。**切換已於 2026-11-23 完成**（main 0d91977，GitHub Pages 來源已改成 GitHub Actions，官網轉接也已更新）。
> 請 Claude Code 先完整讀完這份文件與 `README.md`，再動手。**第五節的切換步驟已經做過，不要再執行。**

## 一、發生了什麼

價值島主站（不含兩個姊妹站）已經從「純靜態 HTML＋瀏覽器端 JavaScript」改寫成 **Next.js（App Router）＋ React**，已於 2026-11-23 合併進 `main` 並上線。每日排程照常更新 main（現在改的是 `data/daily.ts`）。`nextjs` 分支已完成任務，不要再往上面提交。

改寫的原因：
- **搜尋引擎與 AI 搜尋讀得到內容**。舊版的內容都是瀏覽器跑 JavaScript 後才畫出來，不跑 JavaScript 的爬蟲每頁只看得到幾百字（每日觀測 229 字、手記 112 字）。新版在建置時就把文字寫進 HTML（每日觀測約 6,000 字、手記約 5,500 字）。
- **乾淨網址**：`zonetai.com/value-isle/daily`；舊網址 `daily.html` 照樣能開。
- 每頁有自己的標題、說明、正式網址（canonical 指向 zonetai.com），另有 `sitemap.xml`。

**部署位置不變**：仍是這個 repo 的 GitHub Pages（`https://zonetai.github.io/value-isle/`），官網 zonetai.com 照舊把 `/value-isle/*` 轉接過來。差別只是改由 GitHub Actions 建置後發布（`.github/workflows/pages.yml`）。

內容與功能完全對齊 `main` 到 **2026-11-23（c835628）** 為止的所有更新，包含：3D 島嶼與 27 處勘查手冊、「如果…」情境推演與 outlook、名詞小註、四層卡插圖、估價小卡、專題的「較早的專題」與「專欄怎麼寫」、全部的每日觀測資料。兩個姊妹站原封不動。

## 二、檔案對照（舊 → 新）

| 舊版（main） | 新版（nextjs） | 說明 |
|---|---|---|
| `assets/daily.js` | `data/daily.ts` | 每日觀測、專題、outlook。格式同舊版，只是 `window.DAILY =` 改成 `export const DAILY: DailyData =`；欄位定義在 `data/daily-types.ts` |
| `assets/data.js` | `data/site.ts` | 四層、季節、市場、政策、國際、情境推演、勘查點、身分、辭典…。**站內連結寫路徑**：`"/daily"`、`"/daily#layer-ind"`，不寫 `.html` |
| `assets/knowledge.js` | `data/knowledge.ts` | 手記、小測題庫、路人小知識 |
| `assets/icons.js` | `data/icons.ts` | 線條圖示（`<Icon name="bank" />`） |
| `assets/style.css` | `app/globals.css` | 全站樣式，class 名稱沿用 |
| `assets/island.js` | `lib/island-scene.js` | 3D 島嶼，幾乎原樣，只包成 `initIsland()` 並加了離開頁面時的清理 |
| `assets/common.js` | `components/*.tsx` | 導覽列、頁尾、抽屜、季節、名詞小註等拆成 React 元件 |
| `index.html` 等 10 頁 | `app/**/page.tsx` | 每頁一個資料夾，例如 `app/daily/page.tsx` |
| `far-payment/`、`renewal-sandbox/` | `public/far-payment/`、`public/renewal-sandbox/` | 原樣，網址不變；它們用的 `../assets/icons.js` 在 `public/assets/icons.js` |

## 三、之後怎麼改

- **改內容**：通常只改 `data/` 裡的檔案。改完 `npm run build` 能過就可以推。
- **改版面**：頁面在 `app/<頁名>/page.tsx`，互動元件在 `components/`，樣式在 `app/globals.css`。
- **新增主站頁面**：新增 `app/<頁名>/page.tsx`，把頁面加進 `data/site.ts` 的 `pages`，**並請宗淳把頁名加到官網 `next.config.ts` 的 `VALUE_ISLE_PAGES`**（否則經官網進來會開不到）。
- **名詞小註**：`data/site.ts` 的 `glossary` 裡的名詞，會在內文自動加虛線。要讓某段文字套用，用 `<G>{文字}</G>` 包起來（`components/Gloss.tsx`）。
- **姊妹站**：照舊是靜態頁，直接改 `public/far-payment/`、`public/renewal-sandbox/` 裡的檔案。
- **不要做的事**：
  - 不要在 `next.config.ts` 加 `redirects`、`rewrites`、`headers`。網站是靜態匯出，這些不支援，建置會失敗或沒有作用。
  - 不要改 `basePath`（`/value-isle`），它跟 GitHub Pages 的網址路徑、官網轉接綁在一起。
  - 會變動 class 的 React 元素不要加 `reveal`：捲動淡入會被 React 洗掉，導致元素變透明。
  - `body` 有 `data-season` 屬性，CSS 不要寫裸的 `[data-season=…]` 選擇器。
- **本機開發**（Node 22 以上）：

  ```bash
  npm install
  npm run dev          # http://localhost:3301/value-isle
  npm run build        # 靜態匯出到 out/，也會順便補換頁預載檔（scripts/flatten-segments.mjs）
  npm run check:daily  # 每日資料檢查
  ```

## 四、每日觀測排程（不用所長處理）

排程在宗淳那台不關機的電腦，每天 08:00 跑，用的是所長 1151112 交接版的指示。這份指示已經改成**自動判斷新舊版**：
- repo 裡有 `data/daily.ts` 時，改它，並用 `npm run check:daily` 驗證。
- 否則照舊改 `assets/daily.js`。

所以合併當天不需要任何人去改排程。**請所長確認自己電腦上的舊排程已經關閉**，避免兩邊同時更新。

推上 main 後，GitHub Actions 會再跑一次 `check:daily`，接著建置並發布。資料有錯就不發布，網站維持上一版。

## 五、切換（已完成，不要再執行）

2026-11-23 由宗淳這邊完成：
1. `nextjs` 同步到 main 的 c835628（含所長 11/22 的專題改版）。
2. repo Settings → Pages 的來源改成 GitHub Actions。
3. 合併進 main（0d91977），GitHub Actions 約 1 分鐘發布完成。
4. github.io 與 zonetai.com 兩個網址的 10 頁、兩個姊妹站、舊 `.html` 網址、sitemap 都已確認正常。

`scripts/migrate/`（從舊版同步用的腳本）只在過渡期用，穩定一週後可以刪掉。

## 六、官網（Zonetai_Brand-Website）的轉接（已完成）

官網 `next.config.ts` 已更新並上線：
- 主站 10 頁的乾淨網址（`/value-isle/daily`）明確對應到 GitHub Pages 的 `daily.html`。
- 兩個姊妹站的資料夾網址導到各自的 `index.html`，不再被 GitHub Pages 帶去 github.io。
- 首頁 `zonetai.com/value-isle` 直接轉接，不再導到 `index.html`。

**以後新增主站頁面**，要把頁名加進官網 `next.config.ts` 的 `VALUE_ISLE_PAGES`（請宗淳處理），否則經官網進來會開不到。

## 七、驗證紀錄（宗淳這邊做過的）

- 靜態匯出建置通過；`check:daily` 通過（60 則快訊、6 個專題、outlook 完整）。
- 在模擬「官網轉接＋GitHub Pages」的本機環境逐頁測過：
  - 10 頁的站內換頁、回首頁時島嶼重建，主控台沒有錯誤。
  - 情境推演、勘查手冊、名詞小註、專題分組、專欄連到手記並自動展開。
  - 兩個姊妹站，以及舊的 `.html` 網址。
- 先前也在正式模式測過全部互動，手機寬度 10 頁都沒有橫向溢出。
