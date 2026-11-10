/* ============================================================
   價值島 — 共用程式：導覽列、季節、抽屜、提示、捲動顯示
   ============================================================ */
(function(){
  const D = window.DATA;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const VI = window.VI = { $, $$, seasonHandlers: [] };

  VI.toPing = p => Math.round(p * 3.3058 / 1000) / 10;   // 元/m² → 萬/坪
  VI.fmt = n => n.toLocaleString("zh-TW");
  VI.esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

  /* ---------- 季節（跨頁保存） ---------- */
  VI.getSeason = () => localStorage.getItem("vi-season") || "spring";
  VI.setSeason = (s, silent) => {
    if(!D.seasons[s]) s = "spring";
    localStorage.setItem("vi-season", s);
    document.body.dataset.season = s;
    $$(".season button").forEach(b => b.classList.toggle("on", b.dataset.season === s));
    VI.seasonHandlers.forEach(fn => { try{ fn(s, D.seasons[s]); }catch(e){ console.error(e); } });
    if(!silent) VI.toast(`${D.seasons[s].icon} 市場季節切換為「${D.seasons[s].name}」`);
  };
  VI.onSeason = fn => { VI.seasonHandlers.push(fn); fn(VI.getSeason(), D.seasons[VI.getSeason()]); };

  /* ---------- 導覽列 ---------- */
  const here = location.pathname.split("/").pop() || "index.html";
  const nav = document.createElement("nav");
  nav.className = "nav";
  nav.innerHTML = `<div class="container">
    <a class="brand" href="index.html"><span class="logo"></span><span><b>價值島</b><small>估價師的市場觀測站</small></span></a>
    <button class="nav-toggle" aria-label="選單">☰</button>
    <div class="nav-links">${D.pages.map(p => `<a href="${p.href}" class="${p.href===here?"on":""}">${p.label}</a>`).join("")}</div>
    <div class="season" title="切換市場季節：天色、潮位與判讀都會跟著變">
      ${Object.entries(D.seasons).map(([k,v]) => `<button data-season="${k}"><span>${v.icon}</span>${v.name}</button>`).join("")}
    </div></div>`;
  document.body.prepend(nav);
  nav.querySelector(".nav-toggle").onclick = () => nav.querySelector(".nav-links").classList.toggle("open");
  nav.querySelectorAll(".season button").forEach(b => b.onclick = () => VI.setSeason(b.dataset.season));

  /* ---------- 頁尾 ---------- */
  const foot = document.createElement("footer");
  foot.innerHTML = `<div class="container">
    <div><b>價值島 Value Isle</b>
      <p style="margin:0 0 8px">由不動產估價師整理的市場觀測站。市場行情、政策動態、國際局勢、個別條件，四層一起看。本站內容為一般性資訊整理，不構成估價意見、投資或法律建議；個案估價請委託不動產估價師出具報告。</p>
      <p style="margin:0">${VI.esc(D.brand)}</p></div>
    <div><b>資料來源</b><ul>
      <li>內政部地政司 不動產交易實價查詢服務系統（政府資料開放授權條款第 1 版）</li>
      <li>中央銀行、財政部、內政部、金管會公開新聞稿</li>
      <li>資料整理至 ${D.asOf}</li></ul></div>
    <div><b>站內頁面</b><ul>${D.pages.map(p => `<li><a href="${p.href}">${p.label}</a></li>`).join("")}</ul></div>
  </div>`;
  document.body.appendChild(foot);

  /* ---------- 抽屜 ---------- */
  const drawer = document.createElement("div");
  drawer.className = "drawer"; drawer.id = "drawer";
  drawer.innerHTML = `<div class="mask"></div><div class="panel"></div>`;
  document.body.appendChild(drawer);
  drawer.querySelector(".mask").onclick = () => VI.closeDrawer();
  VI.openDrawer = (layerId, focusTitle) => {
    const l = D.layers.find(x => x.id === layerId); if(!l) return;
    const p = drawer.querySelector(".panel"); p.style.setProperty("--c", l.color);
    p.innerHTML = `<button class="close">✕</button>
      <span class="kicker">LAYER ${l.n} · ${l.en}</span><h3>${l.name}</h3>
      <p style="color:var(--ink-2);margin:0">${l.desc}</p>
      <div class="why"><b>估價師怎麼看：</b>${l.why}</div>
      <div class="items">${l.items.map(i => `<div class="card" ${i.t===focusTitle?'style="border-color:var(--c)"':''}><b>${i.t}</b><p>${i.s}</p><div class="impact">⟶ 對估價的影響：${i.i}</div></div>`).join("")}</div>
      <div class="goto"><a class="btn" href="${l.page}">進入「${l.name}」頁 →</a></div>`;
    drawer.classList.add("open");
    p.querySelector(".close").onclick = VI.closeDrawer;
    if(focusTitle){ const el = [...p.querySelectorAll(".items .card")].find(c => c.querySelector("b").textContent === focusTitle); el && setTimeout(() => el.scrollIntoView({block:"center",behavior:"smooth"}), 120); }
  };
  VI.closeDrawer = () => drawer.classList.remove("open");
  document.addEventListener("keydown", e => { if(e.key === "Escape") VI.closeDrawer(); });

  /* ---------- Toast ---------- */
  const toast = document.createElement("div"); toast.className = "toast"; document.body.appendChild(toast);
  VI.toast = (m, ms=2200) => { toast.textContent = m; toast.classList.add("show"); clearTimeout(toast._h); toast._h = setTimeout(() => toast.classList.remove("show"), ms); };

  /* ---------- 捲動顯示 ---------- */
  VI.reveal = () => {
    const io = new IntersectionObserver(es => es.forEach(e => { if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } }), {threshold:.08});
    $$(".reveal:not(.in)").forEach(el => io.observe(el));
  };
  window.addEventListener("DOMContentLoaded", VI.reveal);

  /* ---------- 每日觀測資料（每小時換一次網址，避開快取） ---------- */
  VI.loadDaily = cb => {
    if (window.DAILY) { cb(window.DAILY); return; }
    const s = document.createElement("script");
    s.src = "assets/daily.js?t=" + new Date().toISOString().slice(0, 13);
    s.onload = () => cb(window.DAILY); s.onerror = () => cb(null);
    document.head.appendChild(s);
  };

  /* ---------- 初始化季節（不彈提示） ---------- */
  document.body.dataset.season = VI.getSeason();
  window.addEventListener("DOMContentLoaded", () => VI.setSeason(VI.getSeason(), true));
})();
