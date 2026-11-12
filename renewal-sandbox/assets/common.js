/* ============================================================
   權變沙盤 — 共用程式：導覽列、頁尾、上下站、進度、toast、
   捲動顯示、網址參數、表格與計數小工具
   ============================================================ */
(function(){
  const D = window.RS;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const U = window.RSU = { $, $$ };
  U.icon = (n) => (window.VI_ICON ? window.VI_ICON(n) : "");
  U.fmt = n => Math.round(n).toLocaleString("zh-TW");
  U.esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  U.wan = n => { const w = n / 1e4; return Math.abs(w) >= 10000 ? (w / 1e4).toFixed(2) + " 億" : Math.round(w).toLocaleString("zh-TW") + " 萬"; };
  U.wanShort = n => Math.abs(n) >= 1e8 ? (n / 1e8).toFixed(2) + " 億" : Math.round(n / 1e4).toLocaleString("zh-TW") + " 萬";
  U.pct = (x, d = 1) => (x * 100).toFixed(d) + "%";
  U.ping = (x, d = 1) => Number(x).toFixed(d) + " 坪";

  const here = location.pathname.split("/").pop() || "index.html";
  const stations = D.pages.filter(p => p.n);

  /* ---------- 進度（留在瀏覽器） ---------- */
  const PK = "rs-progress";
  U.progress = () => { try { return JSON.parse(localStorage.getItem(PK) || "{}"); } catch (e) { return {}; } };
  U.mark = (k, v) => { const p = U.progress(); p[k] = v === undefined ? true : v; try { localStorage.setItem(PK, JSON.stringify(p)); } catch (e) {} };
  if (stations.some(p => p.href === here)) U.mark("seen:" + here);

  /* ---------- 網址參數：把輸入編進網址 ---------- */
  U.enc = obj => { try { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); } catch (e) { return ""; } };
  U.dec = s => { try { return JSON.parse(decodeURIComponent(escape(atob(s)))); } catch (e) { return null; } };
  U.param = k => new URLSearchParams(location.search).get(k);
  U.share = (obj, key = "s") => { const u = new URL(location.href); u.searchParams.set(key, U.enc(obj)); return u.toString(); };
  U.copy = async (text, msg = "連結已複製，貼給別人就能看到同一組數字") => {
    try { await navigator.clipboard.writeText(text); U.toast(msg); }
    catch (e) { prompt("複製這個連結", text); }
  };

  /* ---------- 導覽列 ---------- */
  const nav = document.createElement("nav");
  nav.className = "nav";
  nav.innerHTML = `<div class="container">
    <a class="brand" href="index.html"><span class="logo"></span><span><b>權變沙盤</b><small>中泰不動產智庫・價值島姊妹站</small></span></a>
    <button class="nav-toggle" aria-label="選單">${U.icon("menu")}</button>
    <div class="nav-links">${D.pages.map(p => `<a href="${p.href}" class="${p.href === here ? "on" : ""}">${p.n ? `<em>${p.n}</em>` : ""}${p.label}</a>`).join("")}</div>
    <a class="nav-isle" href="../index.html" title="回到價值島">${U.icon("isle")}價值島</a></div>`;
  const main = document.createElement("main");
  [...document.body.children].filter(el => !["SCRIPT", "SVG", "NAV"].includes(el.tagName.toUpperCase())).forEach(el => main.appendChild(el));
  document.body.appendChild(main);
  document.body.prepend(nav);
  nav.querySelector(".nav-toggle").onclick = () => nav.querySelector(".nav-links").classList.toggle("open");

  /* ---------- 頁尾 ---------- */
  const foot = document.createElement("footer");
  foot.innerHTML = `<div class="container">
    <div><b>權變沙盤</b>
      <p style="margin:0 0 8px">把自己家的條件填進去，看估價師怎麼算分回。中泰不動產智庫整理的學習與試算網站，是價值島的姊妹站。本站內容為教學用一般性整理，試算結果不構成估價意見或審議依據；實際案件以三家估價報告與審議決議為準。</p>
      <p style="margin:0">${U.esc(D.brand)}</p></div>
    <div><b>主要依據</b><ul>
      <li>都市更新條例、都市更新權利變換實施辦法</li>
      <li>不動產估價技術規則第十二章（權利變換估價）</li>
      <li>${D.rulesVer}</li>
      <li>資料整理至 ${D.asOf}</li></ul></div>
    <div><b>站內頁面</b><ul>${D.pages.map(p => `<li><a href="${p.href}">${p.n ? p.n + " " : ""}${p.short || p.label}</a></li>`).join("")}<li><a href="../far-payment/index.html">容積代金學堂</a></li><li><a href="../index.html">回價值島</a></li></ul></div>
  </div>`;
  document.body.appendChild(foot);

  /* ---------- 上一站／下一站 ---------- */
  const idx = stations.findIndex(p => p.href === here);
  if (idx >= 0) {
    const prev = stations[idx - 1], next = stations[idx + 1];
    const pn = document.createElement("div"); pn.className = "container pn";
    pn.innerHTML = `${prev ? `<a class="pn-a" href="${prev.href}"><small>上一站</small><b>${prev.n} ${prev.short}</b></a>` : "<span></span>"}${next ? `<a class="pn-a next" href="${next.href}"><small>下一站</small><b>${next.n} ${next.short}</b></a>` : `<a class="pn-a next" href="index.html"><small>回首頁</small><b>三條路線</b></a>`}`;
    document.body.insertBefore(pn, foot);
  }

  /* ---------- Toast ---------- */
  const toast = document.createElement("div"); toast.className = "toast"; document.body.appendChild(toast);
  U.toast = (m, ms = 2400) => { toast.textContent = m; toast.classList.add("show"); clearTimeout(toast._h); toast._h = setTimeout(() => toast.classList.remove("show"), ms); };

  /* ---------- 捲動顯示 ---------- */
  const inView = el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight + 40; };
  U.reveal = () => {
    $$(".reveal:not(.in)").forEach(el => { if (inView(el)) el.classList.add("in"); });
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .08 });
    $$(".reveal:not(.in)").forEach(el => io.observe(el));
  };
  let rt = null; const syncReveal = () => { clearTimeout(rt); rt = setTimeout(() => $$(".reveal:not(.in)").forEach(el => { if (inView(el)) el.classList.add("in"); }), 80); };
  window.addEventListener("DOMContentLoaded", U.reveal);
  window.addEventListener("scroll", syncReveal, { passive: true });
  window.addEventListener("hashchange", syncReveal);
  window.addEventListener("load", () => setTimeout(syncReveal, 300));
  /* 分頁在背景或觀察器沒觸發時，三秒後一律顯示 */
  window.addEventListener("load", () => setTimeout(() => $$(".reveal:not(.in)").forEach(el => el.classList.add("in")), 3000));

  /* ---------- 小工具 ---------- */
  U.table = (head, rows, cls = "") => `<div class="tbl-wrap"><table class="tbl ${cls}"><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => { const cells = Array.isArray(r) ? r : r.c, rc = Array.isArray(r) ? "" : (r._cls || ""); return `<tr${rc ? ` class="${rc}"` : ""}>${cells.map((c, i) => `<td${i === 0 ? ' class="k"' : ""}>${c}</td>`).join("")}</tr>`; }).join("")}</tbody></table></div>`;
  U.countUp = (el, to, fmt = U.fmt, ms = 1000) => {
    const t0 = performance.now(); const step = t => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step);
  };
  U.flip = (sel) => $$(sel).forEach(c => c.addEventListener("click", e => { if (e.target.closest("a,input,button")) return; c.classList.toggle("open"); }));
  /* 燈號清單 */
  U.lamps = (list, mount) => {
    const lv = { warn: "要說明", note: "要確認", ok: "已納入" };
    mount.innerHTML = list.map(c => `<div class="chk ${c.level}"><span class="pill ${c.level}">${lv[c.level]}</span><b>${c.title}</b><div class="more"><div>看什麼：${c.why}</div><div>規則：${c.rule}</div><div>怎麼修：${c.fix}</div><cite>${c.src}</cite></div><button class="lnk" type="button">展開</button></div>`).join("");
    mount.querySelectorAll(".chk").forEach(el => el.querySelector(".lnk").onclick = () => { el.classList.toggle("open"); el.querySelector(".lnk").textContent = el.classList.contains("open") ? "收合" : "展開"; });
    const n = list.filter(c => c.level === "warn").length, m = list.filter(c => c.level === "note").length;
    return `${n ? n + " 項要說明、" : ""}${m} 項要確認、${list.length - n - m} 項已納入`;
  };
  /* 數字輸入列 */
  U.field = (id, label, val, unit = "", step = "any", min = null) => `<label class="fld" for="${id}"><span>${label}${unit ? `<i class="u">${unit}</i>` : ""}</span><input class="inp" type="number" id="${id}" value="${val}" step="${step}"${min !== null ? ` min="${min}"` : ""}></label>`;
})();
