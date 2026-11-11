/* ============================================================
   容積代金學堂 — 共用程式：導覽列、頁尾、提示、捲動顯示、學習進度
   ============================================================ */
(function(){
  const D = window.FP;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const FP = window.FPU = { $, $$ };
  FP.fmt = n => Math.round(n).toLocaleString("zh-TW");
  FP.esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  FP.yi = n => (n / 1e8).toFixed(2) + " 億";

  const here = location.pathname.split("/").pop() || "index.html";
  const lessons = D.pages.filter(p => p.n);

  /* ---------- 學習進度（留在瀏覽器） ---------- */
  const PK = "fp-progress";
  FP.progress = () => { try { return JSON.parse(localStorage.getItem(PK) || "{}"); } catch (e) { return {}; } };
  FP.mark = (k, v) => { const p = FP.progress(); p[k] = v === undefined ? true : v; try { localStorage.setItem(PK, JSON.stringify(p)); } catch (e) {} };
  if (lessons.some(p => p.href === here)) FP.mark("seen:" + here);

  /* ---------- 導覽列 ---------- */
  const nav = document.createElement("nav");
  nav.className = "nav";
  nav.innerHTML = `<div class="container">
    <a class="brand" href="index.html"><span class="logo"><i></i><i></i></span><span><b>容積代金學堂</b><small>FAR Payment Study · 中泰不動產智庫</small></span></a>
    <button class="nav-toggle" aria-label="選單">☰</button>
    <div class="nav-links">${D.pages.map(p => `<a href="${p.href}" class="${p.href === here ? "on" : ""}">${p.n ? `<em>${p.n}</em>` : ""}${p.label}</a>`).join("")}</div>
    <a class="nav-isle" href="../index.html" title="回到價值島">🏝️ 價值島</a></div>`;
  document.body.prepend(nav);
  nav.querySelector(".nav-toggle").onclick = () => nav.querySelector(".nav-links").classList.toggle("open");

  /* ---------- 頁尾 ---------- */
  const foot = document.createElement("footer");
  foot.innerHTML = `<div class="container">
    <div><b>容積代金學堂</b>
      <p style="margin:0 0 8px">同一基地、兩套情境、一個差額。中泰不動產智庫依${D.course}課程教材整理的學習網站，是價值島的姊妹站。本站內容為教學用一般性整理，不構成估價意見或審議依據；實際案件以主管機關現行範本、法規及審議決議為準。</p>
      <p style="margin:0">${FP.esc(D.brand)}</p></div>
    <div><b>主要依據</b><ul>
      <li>都市計畫法第 83 條之 1；都市計畫容積移轉實施辦法（103.08.04 修正）</li>
      <li>臺北市容積移轉審查許可自治條例（110.07.15 修正）</li>
      <li>臺北市容積代金估價報告書範本（113 年修正版）</li>
      <li>臺北代金估價通案原則研析（115 年度學員版）、114 年度協檢專案期末總結報告</li>
      <li>資料整理至 ${D.asOf}</li></ul></div>
    <div><b>站內頁面</b><ul>${D.pages.map(p => `<li><a href="${p.href}">${p.n ? p.n + " " : ""}${p.short || p.label}</a></li>`).join("")}<li><a href="../index.html">回價值島</a></li></ul></div>
  </div>`;
  document.body.appendChild(foot);

  /* ---------- 上一課／下一課 ---------- */
  const idx = lessons.findIndex(p => p.href === here);
  if (idx >= 0) {
    const prev = lessons[idx - 1], next = lessons[idx + 1];
    const pn = document.createElement("div"); pn.className = "container pn";
    pn.innerHTML = `${prev ? `<a class="pn-a" href="${prev.href}"><small>← 上一站</small><b>${prev.n} ${prev.short}</b></a>` : "<span></span>"}${next ? `<a class="pn-a next" href="${next.href}"><small>下一站 →</small><b>${next.n} ${next.short}</b></a>` : `<a class="pn-a next" href="index.html"><small>回首頁</small><b>學習路線</b></a>`}`;
    document.body.insertBefore(pn, foot);
  }

  /* ---------- Toast ---------- */
  const toast = document.createElement("div"); toast.className = "toast"; document.body.appendChild(toast);
  FP.toast = (m, ms = 2200) => { toast.textContent = m; toast.classList.add("show"); clearTimeout(toast._h); toast._h = setTimeout(() => toast.classList.remove("show"), ms); };

  /* ---------- 捲動顯示 ---------- */
  const inView = el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight + 40; };
  FP.reveal = () => {
    $$(".reveal:not(.in)").forEach(el => { if (inView(el)) el.classList.add("in"); });
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .08 });
    $$(".reveal:not(.in)").forEach(el => io.observe(el));
  };
  let rt = null; const syncReveal = () => { clearTimeout(rt); rt = setTimeout(() => $$(".reveal:not(.in)").forEach(el => { if (inView(el)) el.classList.add("in"); }), 80); };
  window.addEventListener("DOMContentLoaded", FP.reveal);
  window.addEventListener("scroll", syncReveal, { passive: true });
  window.addEventListener("hashchange", syncReveal);
  window.addEventListener("load", () => setTimeout(syncReveal, 300));

  /* ---------- 小工具：表格、計數動畫 ---------- */
  FP.table = (head, rows, cls = "") => `<div class="tbl-wrap"><table class="tbl ${cls}"><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${i === 0 ? ' class="k"' : ""}>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  FP.countUp = (el, to, fmt = FP.fmt, ms = 1200) => {
    const t0 = performance.now(); const step = t => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step);
  };
  /* 開合式卡片 */
  FP.flip = (sel) => $$(sel).forEach(c => c.addEventListener("click", e => { if (e.target.closest("a")) return; c.classList.toggle("open"); }));
})();
