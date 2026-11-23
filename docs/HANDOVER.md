# 價值島改版交接（給所長的 Claude Code）

> 撰寫：宗淳（2026-11-23）。這份文件在 `nextjs` 分支的 `docs/HANDOVER.md`。
> 請 Claude Code 先完整讀完這份文件與 `README.md`，再動手。

## 一、發生了什麼

價值島主站（不含兩個姊妹站）已經從「純靜態 HTML＋瀏覽器端 JavaScript」改寫成 **Next.js（App Router）＋ React**，放在 `nextjs` 分支。`main` 目前還是舊版，**每日排程仍照常更新 main**。

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

## 五、切換步驟（請所長的 Claude Code 照順序做）

需要 repo 管理員權限（第 2 步）。每一步做完先確認再做下一步。

1. **同步最新的 main 進 nextjs**（如果 c835628 之後 main 又有新的 commit）：

   ```bash
   git fetch origin
   git log --oneline c835628..origin/main      # 只有「每日觀測 YYYY-MM-DD」可以直接走下一步
   git checkout nextjs && git merge origin/main # 會有「舊檔已刪除」的衝突，照下面處理
   python -I -X utf8 scripts/migrate/sync-static.py origin/main   # 從 main 重新產生 data/、app/globals.css、lib/island-scene.js
   git rm -q --cached about.html daily.html drill.html global.html index.html market.html notes.html policy.html roles.html weather.html assets/*.js assets/*.css 2>/dev/null
   ```

   - 衝突的舊檔一律刪除，內容以同步腳本產生的為準。
   - 若 main 上除了每日觀測還有版面改動（`*.html`、`assets/common.js`、`assets/style.css`、`assets/island.js`），資料與樣式會由腳本帶過來，**頁面行為的改動要手動搬進 `app/`、`components/`**。可以參考 `git diff c835628 origin/main -- '*.html' assets/common.js`。
   - 跑 `npm run build` 與 `npm run check:daily`，都通過才提交到 nextjs。

2. **把 GitHub Pages 的來源改成 GitHub Actions**：repo Settings → Pages → Build and deployment → Source 選「GitHub Actions」。也可以用指令：

   ```bash
   gh api -X PUT repos/zonetai/value-isle/pages -f build_type=workflow
   ```

   改完後舊網站會繼續上線，直到下一步發布新版為止，不會中斷。

3. **合併到 main**：

   ```bash
   git checkout main && git pull --ff-only origin main
   git merge --no-ff nextjs -m "價值島改用 Next.js（靜態匯出到 GitHub Pages）"
   git push origin main
   ```

   如果 merge 前 main 又多了一筆每日觀測，先回到第 1 步把它同步進 nextjs。

4. **確認發布**：repo 的 Actions 頁面「發布到 GitHub Pages」要是綠燈（約 2 分鐘）。接著檢查：
   - `https://zonetai.github.io/value-isle/`：首頁、島嶼、「如果…」
   - `https://zonetai.github.io/value-isle/daily.html`
   - `https://zonetai.github.io/value-isle/far-payment/`
   - `https://zonetai.com/value-isle/daily`（經官網轉接）

5. **通知宗淳**部署官網的第二段修改（首頁不再導到 index.html，見下節）。

6. 確認穩定一週後，可以刪掉 `scripts/migrate/`（只在過渡期用）。

## 六、官網（Zonetai_Brand-Website）要配合的修改（由宗淳處理）

兩段修改都已經在宗淳電腦上準備好，還沒推送：
- **A（`value-isle-a` 分支，可以在切換前部署，新舊兩版都適用）**：
  - 主站 10 頁的乾淨網址明確對應到 GitHub Pages 的 `.html`。
  - 兩個姊妹站的資料夾網址導到 `index.html`。這也修好一個**現存的問題**：今天從 `zonetai.com/value-isle/far-payment/` 進去，會被 GitHub Pages 的 301 帶到 `zonetai.github.io`。
- **B（`value-isle-b` 分支，第 4 步確認新版上線後才部署）**：首頁 `zonetai.com/value-isle` 直接轉接，不再導到 `/value-isle/index.html`。

## 七、驗證紀錄（宗淳這邊做過的）

- 靜態匯出建置通過；`check:daily` 通過（60 則快訊、6 個專題、outlook 完整）。
- 在模擬「官網轉接＋GitHub Pages」的本機環境逐頁測過：
  - 10 頁的站內換頁、回首頁時島嶼重建，主控台沒有錯誤。
  - 情境推演、勘查手冊、名詞小註、專題分組、專欄連到手記並自動展開。
  - 兩個姊妹站，以及舊的 `.html` 網址。
- 先前也在正式模式測過全部互動，手機寬度 10 頁都沒有橫向溢出。
