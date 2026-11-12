/* ============================================================
   價值島 — 共用程式：導覽列、季節、抽屜、提示、捲動顯示
   ============================================================ */
(function(){
  const D = window.DATA;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const VI = window.VI = { $, $$, seasonHandlers: [] };
  VI.icon = window.VI_ICON || (() => "");   // 線條圖示（assets/icons.js）

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
    if(!silent) VI.toast(`市場季節切換為「${D.seasons[s].name}」`);
  };
  VI.onSeason = fn => { VI.seasonHandlers.push(fn); fn(VI.getSeason(), D.seasons[VI.getSeason()]); };

  /* ---------- 導覽列 ---------- */
  const here = location.pathname.split("/").pop() || "index.html";
  const nav = document.createElement("nav");
  nav.className = "nav";
  nav.innerHTML = `<div class="container">
    <a class="brand" href="index.html"><span class="logo"></span><span><b>價值島</b><small>中泰不動產智庫・市場觀測站</small></span></a>
    <button class="nav-toggle" aria-label="選單" aria-expanded="false">${VI.icon("menu")}</button>
    <div class="nav-links">${D.pages.map(p => `<a href="${p.href}" class="${p.href===here?"on":""}">${p.label}</a>`).join("")}</div>
    <div class="season" title="切換市場季節：天色、潮位與判讀都會跟著變">
      ${Object.entries(D.seasons).map(([k,v]) => `<button data-season="${k}" aria-label="${v.name}"><span>${VI.icon(v.icon)}</span>${v.name}</button>`).join("")}
    </div></div>`;
  document.body.prepend(nav);
  /* 窄螢幕的下拉選單：點按鈕開關，點選單外面或按 Esc 收起 */
  const navToggle = nav.querySelector(".nav-toggle"), navLinks = nav.querySelector(".nav-links");
  const setMenu = open => { navLinks.classList.toggle("open", open); navToggle.setAttribute("aria-expanded", open); navToggle.innerHTML = VI.icon(open ? "close" : "menu"); };
  navToggle.onclick = e => { e.stopPropagation(); setMenu(!navLinks.classList.contains("open")); };
  document.addEventListener("click", e => { if (navLinks.classList.contains("open") && !navLinks.contains(e.target)) setMenu(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });
  nav.querySelectorAll(".season button").forEach(b => b.onclick = () => VI.setSeason(b.dataset.season));

  /* ---------- 頁尾 ---------- */
  const foot = document.createElement("footer");
  foot.innerHTML = `<div class="container">
    <div><b>價值島 Value Isle</b>
      <p style="margin:0 0 8px">由中泰不動產智庫整理的市場觀測站。市場行情、政策動態、國際局勢、個別條件，四層一起看。本站內容為一般性資訊整理，不構成估價意見、投資或法律建議；個案估價請委託不動產估價師出具報告。</p>
      <p style="margin:0">${VI.esc(D.brand)}</p></div>
    <div><b>資料來源</b><ul>
      <li>內政部地政司 不動產交易實價查詢服務系統（政府資料開放授權條款第 1 版）</li>
      <li>中央銀行、財政部、內政部、金管會公開新聞稿</li>
      <li>每日觀測：各則附原始出處</li>
      <li id="footAsOf">資料整理至 ${D.asOf}</li></ul></div>
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
    p.innerHTML = `<button class="close" aria-label="關閉">${VI.icon("close")}</button>
      <span class="kicker">第 ${+l.n} 層</span><h3>${l.name}</h3>
      <p style="color:var(--ink-2);margin:0">${l.desc}</p>
      <div class="why"><b>估價師怎麼看：</b>${l.why}</div>
      <div class="items">${l.items.map(i => `<div class="card" ${i.t===focusTitle?'style="border-color:var(--c)"':''}><b>${i.t}</b><p>${i.s}</p><div class="impact"><b>對估價的影響：</b>${i.i}</div></div>`).join("")}</div>
      <div class="goto"><a class="btn" href="${l.page}">${l.page.startsWith("daily.html") ? "看這一層的最新動態" : "進入「" + l.name + "」頁"}</a></div>`;
    drawer.classList.add("open");
    p.querySelector(".close").onclick = VI.closeDrawer;
    VI.loadDaily(DAILY => {
      if (!DAILY || !drawer.classList.contains("open")) return;
      const news = DAILY.briefs.filter(b => b.layer === layerId).slice(0, 3); if (!news.length) return;
      const box = document.createElement("div"); box.className = "dr-news";
      box.innerHTML = `<div class="dr-news-head"><span><i class="ld-live"></i>最新動態</span><a href="daily.html#layer-${layerId}">全部動態</a></div>` + news.map(b => `<a href="${VI.esc(b.url)}" target="_blank" rel="noopener"><span class="date">${b.d.slice(5).replace("-", "/")}</span><span><b>${VI.esc(b.t)}</b><small>${VI.esc(b.i || b.s)}</small></span></a>`).join("");
      const items = p.querySelector(".items"); if (items) p.insertBefore(box, items);
    });
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

  /* ---------- 各層頁面內嵌的「最新動態」（資料來自每日觀測） ---------- */
  const srcLink = (src, url) => url ? `<a href="${VI.esc(url)}" target="_blank" rel="noopener">${VI.esc(src)} ↗</a>` : VI.esc(src || "");
  const md = d => d.slice(5).replace("-", "/");
  VI.layerDaily = (layerId, sel, opts = {}) => VI.loadDaily(DAILY => {
    const el = $(sel), L = D.layers.find(l => l.id === layerId); if (!el || !L) return;
    if (!DAILY) { el.style.display = "none"; return; }
    const items = DAILY.briefs.filter(b => b.layer === layerId).slice(0, opts.n || 4), topics = DAILY.topics.filter(t => t.layer === layerId);
    if (!items.length && !topics.length) { el.style.display = "none"; return; }
    el.style.setProperty("--c", L.hex);
    el.innerHTML = `<div class="ld-head"><div><span class="kicker"><i class="ld-live"></i>最新動態 · 更新至 ${DAILY.updated}</span><h2>${opts.title || L.name + "的最新動態"}</h2><p>${opts.desc || "每天早上自動整理，每則附出處與對估價的影響。"}</p></div><a class="btn ghost sm" href="daily.html#layer-${layerId}">看這一層全部動態</a></div>
      ${topics.map(t => `<a class="card ld-topic" href="daily.html#${t.id}"><span class="tag ${L.cls}">專題</span><div><b>${VI.esc(t.title)}</b><small>${VI.esc(t.status || "")}</small><p>${VI.esc(t.summary || "")}</p></div><span class="go">看專題</span></a>`).join("")}
      <div class="ld-grid">${items.map((b, i) => `<article class="card ld-item" style="animation-delay:${i * 60}ms"><div class="meta"><span class="date">${md(b.d)}</span>${b.tag ? `<span class="tag">${VI.esc(b.tag)}</span>` : ""}</div><h3>${VI.esc(b.t)}</h3><p>${VI.esc(b.s)}</p>${b.i ? `<div class="impact">${VI.esc(b.i)}</div>` : ""}<div class="src">${srcLink(b.src, b.url)}</div></article>`).join("")}</div>`;
  });
  /* 四層各有幾則新動態（氣象台與首頁索引用） */
  VI.dailyCounts = cb => VI.loadDaily(DAILY => {
    if (!DAILY) return; const out = {};
    D.layers.forEach(l => { const list = DAILY.briefs.filter(b => b.layer === l.id); out[l.id] = { n: list.length, latest: list[0] || null }; });
    cb(out, DAILY);
  });

  /* ---------- 頁尾日期：跟著每日觀測的更新日期走（取較新的一個） ---------- */
  VI.loadDaily(DAILY => {
    const el = document.getElementById("footAsOf"); if (!el) return;
    const d = DAILY && DAILY.updated > D.asOf ? DAILY.updated : D.asOf;
    el.textContent = `資料整理至 ${d}`;
  });

  /* ---------- 閱讀進度與回頁首 ---------- */
  const prog = document.createElement("i"); prog.className = "nav-progress"; nav.appendChild(prog);
  const toTop = document.createElement("button"); toTop.className = "to-top"; toTop.setAttribute("aria-label", "回到頁首"); toTop.innerHTML = VI.icon("up"); document.body.appendChild(toTop);
  toTop.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
  let ticking = false;
  const onScroll = () => { ticking = false; const max = document.documentElement.scrollHeight - innerHeight, y = scrollY; prog.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`; nav.classList.toggle("scrolled", y > 8); toTop.classList.toggle("on", y > 700); };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* ---------- 內頁頁首：層次浮水印與波浪收邊 ---------- */
  (function () {
    const ph = $(".page-hero"); if (!ph) return;
    const mark = { "weather.html": "cloudsun", "market.html": "tide", "policy.html": "gavel", "global.html": "ship", "notes.html": "deed", "roles.html": "talk", "drill.html": "target", "about.html": "isle" }[here];
    if (mark && !ph.classList.contains("daily-hero")) ph.insertAdjacentHTML("beforeend", `<span class="ph-mark" aria-hidden="true">${VI.icon(mark)}</span>`);
    const w = (y, a) => `M0 ${y}q60 ${-a} 120 0${"t120 0".repeat(13)}V46H0z`;
    ph.insertAdjacentHTML("beforeend", `<svg class="ph-wave" viewBox="0 0 1440 46" preserveAspectRatio="none" aria-hidden="true"><path d="${w(19, 13)}" fill="currentColor" opacity=".13"/><path d="${w(28, 10)}" fill="#fbf7f1"/></svg>`);
  })();

  /* ---------- 名詞小註：內文第一次出現的估價名詞加虛線，滑過或點一下看白話解釋 ---------- */
  const GL = (D.glossary || []).map(g => ({ g, keys: g.k || g.t.split(" / ").map(p => /因素$/.test(g.t) && !/因素$/.test(p) ? p + "因素" : p) }));
  const GL_SKIP = "a,button,h1,h2,h3,h4,summary,label,input,textarea,select,script,style,svg,.gl,.gl-pop,.nav,footer,.glossary,.quiz,.pin,.chip,.tag,.kicker,.toast,.layer-row,.item-row,.tl-player,[data-nogloss]";
  const GL_SCOPE = ".card,.page-hero,.section-head,.hero-panel,.scene-card,.tour,.drawer .panel,.layer-daily";
  function gloss() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => { const p = n.parentElement; return n.nodeValue.length < 3 || !p || p.closest(GL_SKIP) || !p.closest(GL_SCOPE) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const scope = node.parentElement.closest(GL_SCOPE), text = node.nodeValue; let best = null;
      GL.forEach((e, i) => { if (scope.querySelector(`.gl[data-g="${i}"]`)) return; e.keys.forEach(key => { const at = text.indexOf(key); if (at >= 0 && (!best || at < best.at)) best = { at, key, i }; }); });
      if (!best) return;
      const span = document.createElement("span"); span.className = "gl"; span.dataset.g = best.i; span.tabIndex = 0; span.textContent = best.key;
      const after = node.splitText(best.at); after.nodeValue = after.nodeValue.slice(best.key.length); node.parentNode.insertBefore(span, after);
    });
  }
  if (GL.length) {
    const pop = document.createElement("div"); pop.className = "gl-pop"; pop.setAttribute("role", "tooltip"); document.body.appendChild(pop);
    const show = el => {
      const e = GL[+el.dataset.g]; if (!e) return;
      pop.innerHTML = `<b>${VI.esc(e.g.t)}<small>名詞小註</small></b>${VI.esc(e.g.d)}`; pop.classList.add("on");
      const r = el.getBoundingClientRect(), pw = pop.offsetWidth, phh = pop.offsetHeight, vw = document.documentElement.clientWidth;
      const x = Math.max(8, Math.min(r.left + r.width / 2 - pw / 2, vw - pw - 8)), above = r.top - phh - 8 > 64;
      pop.style.left = (x + scrollX) + "px"; pop.style.top = ((above ? r.top - phh - 8 : r.bottom + 8) + scrollY) + "px";
    };
    const hide = () => pop.classList.remove("on");
    const glOf = e => e.target && e.target.closest ? e.target.closest(".gl") : null;
    document.addEventListener("mouseover", e => { const el = glOf(e); if (el) show(el); });
    document.addEventListener("mouseout", e => { if (glOf(e)) hide(); });
    document.addEventListener("focusin", e => { const el = glOf(e); if (el) show(el); });
    document.addEventListener("focusout", e => { if (glOf(e)) hide(); });
    document.addEventListener("click", e => { const el = glOf(e); if (el) show(el); else hide(); });
    addEventListener("scroll", hide, { passive: true });
    /* 內容是各頁用 JS 畫出來的，畫面有新增節點就重新掃一次（每次掃描每個名詞每張卡只標一處，會自己收斂） */
    let glT = null;
    const quiet = "#island-labels,#ticker,.gl-pop,.toast,.loader,.scene-tip";
    new MutationObserver(ms => { if (glT) return; if (ms.some(m => m.addedNodes.length && !(m.target.closest && m.target.closest(quiet)))) glT = setTimeout(() => { glT = null; gloss(); }, 160); }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener("DOMContentLoaded", () => setTimeout(gloss, 80));
  }

  /* ---------- 初始化季節（不彈提示） ---------- */
  document.body.dataset.season = VI.getSeason();
  window.addEventListener("DOMContentLoaded", () => VI.setSeason(VI.getSeason(), true));
})();
