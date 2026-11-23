"""
從舊版靜態網站（main 分支的 assets/*.js、style.css）重新產生 Next.js 版的對應檔案。

只在改版過渡期用：所長在舊版改了資料、樣式或島嶼，上線前跑一次就能同步過來。
Next.js 版正式上線、舊版的 assets/ 不再更新之後，這支腳本就可以刪掉。

用法（在 value-isle-next 資料夾）：
    git fetch origin
    python -I -X utf8 scripts/migrate/sync-static.py [來源，預設 origin/main]

產生的檔案：data/site.ts、data/knowledge.ts、data/daily.ts、data/icons.ts、app/globals.css、lib/island-scene.js
"""
import re
import subprocess
import sys

REF = sys.argv[1] if len(sys.argv) > 1 else "origin/main"
ROUTES = {"index.html": "/", "daily.html": "/daily", "weather.html": "/weather", "market.html": "/market",
          "policy.html": "/policy", "global.html": "/global", "notes.html": "/notes", "roles.html": "/roles",
          "drill.html": "/drill", "about.html": "/about"}


def show(path: str) -> str:
    return subprocess.run(["git", "show", f"{REF}:{path}"], capture_output=True, check=True).stdout.decode("utf-8")


def write(path: str, text: str) -> None:
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text.rstrip() + "\n")
    print("寫入", path)


def must_replace(s: str, a: str, b: str, n: int = 1) -> str:
    c = s.count(a)
    if c != n:
        raise SystemExit(f"找不到預期的程式片段（{c} 處，預期 {n}）：{a[:90]!r}")
    return s.replace(a, b)


# ---------- 資料檔 ----------
def to_routes(s: str) -> str:
    for old, new in ROUTES.items():
        for q in ['"', "'"]:
            s = s.replace(f"{q}{old}{q}", f"{q}{new}{q}").replace(f"{q}{old}#", f"{q}{new}#")
    return s


site = must_replace(show("assets/data.js"), "window.DATA = {", "export const DATA = {")
site = to_routes(site)
site = site.replace("要更新內容，改這個檔案就好；每一頁都會讀它。",
                    "要更新內容，改這個檔案就好；每一頁都會讀它。\n   站內連結寫成路徑（例如 \"/daily\"），網址前綴 /value-isle 由網站自動加上。", 1)
left = re.findall(r"[\"'][a-z]+\.html", site)
if left:
    raise SystemExit(f"data/site.ts 還有沒轉換的 .html 連結：{left}")
write("data/site.ts", site)

write("data/knowledge.ts", must_replace(show("assets/knowledge.js"), "window.KN = {", "export const KN = {"))

daily = must_replace(show("assets/daily.js"), "window.DAILY = {",
                     'import type { DailyData } from "./daily-types";\n\nexport const DAILY: DailyData = {')
write("data/daily.ts", daily)

# ---------- 圖示 ----------
icons = show("assets/icons.js")
start, end = icons.index("  const F = "), icons.index("  const sprite = ")
body = "\n".join(l[2:] if l.startswith("  ") else l for l in icons[start:end].split("\n"))
body = must_replace(body, "const I = {", "export const ICONS: Record<string, string> = {")
write("data/icons.ts", '''/* ============================================================
   價值島 — 圖示（自繪線條 icon）
   規格：24×24、線寬 1.6、圓角端點；F 是 16% 的淡色填色。
   顏色跟著文字色（currentColor），大小跟著字級（1em）。
   用法：<Icon name="wave" />；資料檔（data/site.ts）的 icon／ico 欄位只放這裡的名稱。
   要新增圖示就在 ICONS 加一筆。
   ============================================================ */
''' + body.rstrip() + '''

/** 全站共用的 SVG sprite：每個圖示一個 <symbol id="i-名稱">，頁面用 <use href="#i-名稱"> 引用 */
export const SPRITE = Object.entries(ICONS)
  .map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${v}</symbol>`)
  .join("");''')

# ---------- 樣式 ----------
css = show("assets/style.css")
css = re.sub(r'\.brand \.logo\{[^}]*background:url\("favicon\.svg"\)[^}]*\}',
             ".brand .logo{width:38px;height:38px;display:block;flex:none}", css, count=1)
if 'url("favicon' in css:
    raise SystemExit("style.css 還有引用 favicon 檔案，需要人工處理")
css = css.replace("   價值島 Value Isle — 共用樣式", "   價值島 Value Isle — 共用樣式（Next.js 版：app/globals.css，由 scripts/migrate/sync-static.py 從舊版產生）", 1)
css += "\n/* 沒開 JavaScript 時不做捲動顯示，內容直接出現 */\n.no-js .reveal{opacity:1;transform:none}\n"
write("app/globals.css", css)

# ---------- 3D 島嶼：只換掉「拿資料、換頁、找元素」這幾個接點，其餘照原樣 ----------
s = show("assets/island.js")
s = must_replace(s, """const D = window.DATA, VI = window.VI, KN = window.KN || {};
const wrap = document.getElementById('island-canvas');
const labelWrap = document.getElementById('island-labels');
const loader = document.getElementById('loader');
const tourEl = document.getElementById('tour');""",
"""/**
 * 在 root（首頁的 .island-hero）裡面建立 3D 島嶼。opts：
 *   D（data/site 的 DATA）、KN（data/knowledge 的 KN）、
 *   VI：{ toast(msg, ms), openDrawer(layerId), onSeason(fn) }，navigate(path)：站內換頁（例如 '/daily'）。
 * 點選層次與勘查點時照舊在 document 上發出 island:select、island:spot 事件。
 * 回傳 API（select、spot、spotClear、scenario、labels、currents、pause、bird、home、startTour…）；離開頁面時呼叫 API.dispose()。
 */
export function initIsland(opts) {
const { D, VI, navigate } = opts, KN = opts.KN || {};
const root = opts.root;
const wrap = root.querySelector('#island-canvas');
const labelWrap = root.querySelector('#island-labels');
const loader = root.querySelector('#loader');
const tourEl = root.querySelector('#tour');
let disposed = false;""")
s = must_replace(s, "catch (e) { loader.classList.add('off'); document.querySelector('.fallback-scene')?.classList.add('on'); throw e; }",
                 "catch (e) { loader.classList.add('off'); root.querySelector('.fallback-scene')?.classList.add('on'); return null; }")
s = must_replace(s, "lighthouse.userData.href = 'daily.html';", "lighthouse.userData.href = '/daily';")
s = must_replace(s, "makePin('每日觀測', '↗', null, lighthouse, new THREE.Vector3(0, 3.5, 0), 'link').onclick = () => { location.href = 'daily.html'; };",
                 "makePin('每日觀測', '↗', null, lighthouse, new THREE.Vector3(0, 3.5, 0), 'link').onclick = () => { navigate('/daily'); };")
s = must_replace(s, "  else if (p.href) location.href = p.href;", "  else if (p.href) navigate(p.href);")
s = must_replace(s, "const API = window.ISLAND = {", "const API = {")
s = must_replace(s, "const needle = document.getElementById('compassNeedle');", "const needle = root.querySelector('#compassNeedle');")
s = must_replace(s, "function animate() {\n  requestAnimationFrame(animate);", "function animate() {\n  if (disposed) return;\n  requestAnimationFrame(animate);")
s = must_replace(s, "new ResizeObserver(resize).observe(wrap); resize();", "const ro = new ResizeObserver(resize); ro.observe(wrap); resize();")
tail = "requestAnimationFrame(() => { setProgress(100); animate(); });"
if not s.rstrip().endswith(tail):
    raise SystemExit("island.js 結尾跟預期不同，需要人工檢查")
s = s.replace("   價值島 — 3D 島嶼場景 v2（Three.js，全部程式生成）",
              "   價值島 — 3D 島嶼場景 v2（Three.js，全部程式生成）\n   Next.js 版：由 components/IslandHero.tsx 動態載入，呼叫 initIsland()；由 scripts/migrate/sync-static.py 從舊版產生", 1)
s = s.rstrip() + """

/* 離開頁面時收掉：停止動畫、釋放 WebGL、清掉標示與提示 */
API.dispose = () => {
  disposed = true; ro.disconnect(); controls.dispose();
  renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss();
  renderer.domElement.remove(); labelWrap.innerHTML = ''; tip.remove();
  root.classList.remove('touring');
};
return API;
}
"""
for bad in ["window.DATA", "window.VI", "window.KN", "window.ISLAND", "location.href", "getElementById("]:
    if bad in s:
        raise SystemExit(f"island-scene.js 還有 {bad}")
write("lib/island-scene.js", s)
print("完成，來源：", REF)
