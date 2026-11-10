/* ============================================================
   價值島 — 圖示（線條 icon，取代 emoji）
   規格：24×24、線寬 1.6、圓角端點；F 是 16% 的淡色填色。
   顏色跟著文字色（currentColor），大小跟著字級（1em）。
   用法：VI.icon("wave") → <svg class="ic">…</svg>；HTML 裡可直接寫
        <svg class="ic"><use href="#i-wave"/></svg>
   資料檔（data.js）裡的 icon／ico 欄位只放這裡的名稱。
   ============================================================ */
(function(){
  const F = 'fill="currentColor" fill-opacity=".16"';
  const S = 'fill="currentColor" stroke="none"';
  const I = {
    /* 季節 */
    sprout:   `<path d="M12 21v-9"/><path ${F} d="M12 12C8 12 5.5 9.6 5.5 5.5 9.6 5.5 12 8 12 12z"/><path ${F} d="M12 10.5C12 7 14.2 4.5 18.5 4.5c0 4-2.5 6-6.5 6z"/><path d="M7.5 21h9"/>`,
    sun:      `<circle ${F} cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>`,
    leaf:     `<path ${F} d="M5 19C5 10.5 10.5 5 19 5c0 8.5-5.5 14-14 14z"/><path d="M5 19l8.5-8.5M9.5 14.5V11.8M12 12h-2.6"/>`,
    snow:     `<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.6 4.6 12 7l2.4-2.4M9.6 19.4 12 17l2.4 2.4M3.9 10.6l3.3-.9-.9-3.3M20.1 13.4l-3.3.9.9 3.3M6.3 17l.9-3.3-3.3-.9M17.7 7l-.9 3.3 3.3.9"/>`,

    /* 四層 */
    wave:     `<path d="M2.5 8c2.4 0 2.4-2 4.75-2S9.6 8 12 8s2.4-2 4.75-2S19.1 8 21.5 8"/><path d="M2.5 13c2.4 0 2.4-2 4.75-2S9.6 13 12 13s2.4-2 4.75-2 2.35 2 4.75 2"/><path ${F} d="M2.5 18c2.4 0 2.4-2 4.75-2S9.6 18 12 18s2.4-2 4.75-2 2.35 2 4.75 2v3h-19z"/>`,
    cloudsun: `<circle ${F} cx="8" cy="8.5" r="3.2"/><path d="M8 2.5v1.3M2 8.5h1.3M3.8 4.3l.9.9M12.2 4.3l-.9.9"/><path d="M7.5 19.5h10a3.5 3.5 0 0 0 .3-7 5.2 5.2 0 0 0-9.9 1.3 2.9 2.9 0 0 0-.4 5.7z"/>`,
    tide:     `<path d="M16.5 3v18M16.5 5.5H19M16.5 8.5h1.6M16.5 11.5H19"/><path ${F} d="M2.5 15c2.4 0 2.4-1.6 4.75-1.6S9.6 15 12 15s2.4-1.6 4.75-1.6 2.35 1.6 4.75 1.6V21h-19z"/>`,
    ruler:    `<rect ${F} x="2.5" y="8" width="19" height="8" rx="1.5"/><path d="M6.5 8v3M10 8v2M13.5 8v3M17 8v2"/>`,

    /* 國際海象的力量 */
    bank:     `<path ${F} d="M3 9.5 12 4l9 5.5z"/><path d="M6 10v7M10 10v7M14 10v7M18 10v7M4.5 17.5h15M3.5 20.5h17"/>`,
    exchange: `<circle ${F} cx="12" cy="12" r="3.2"/><path d="M4 8.5h14l-3.5-3.5M20 15.5H6l3.5 3.5"/>`,
    ship:     `<path ${F} d="M3 14.5h18l-2.4 5H5.4z"/><path d="M5.5 14.5v-4h3.5v4M9 14.5v-4h3.5v4M15 14.5V7.5h3v7M16.5 7.5V5"/>`,
    oil:      `<path ${F} d="M12 3.5s-6 6.6-6 11a6 6 0 0 0 12 0c0-4.4-6-11-6-11z"/><path d="M9.3 14.8a2.7 2.7 0 0 0 2.7 2.7"/>`,
    chip:     `<rect ${F} x="6.5" y="6.5" width="11" height="11" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5" rx=".6"/><path d="M9.5 3v3.5M14.5 3v3.5M9.5 17.5V21M14.5 17.5V21M3 9.5h3.5M3 14.5h3.5M17.5 9.5H21M17.5 14.5H21"/>`,
    bars:     `<path d="M3.5 20.5h17"/><rect ${F} x="5" y="12.5" width="3" height="8" rx=".6"/><rect ${F} x="10.5" y="8.5" width="3" height="12" rx=".6"/><rect ${F} x="16" y="4.5" width="3" height="16" rx=".6"/>`,
    trend:    `<path d="M3.5 20.5h17"/><path d="M4.5 16.5 9 11.5l4 3.5 6.5-8.5"/><path d="M15 6.5h4.5V11"/>`,
    crane:    `<path d="M8 21V6M3 6h18M8 3 3 6M8 3l13 3M18 6v6M5 21h6"/><path ${F} d="M16.5 12h3v2.5h-3zM3 6h3v2.5H3z"/>`,
    shield:   `<path ${F} d="M12 3l7 2.8v5.4c0 4.6-3 8.2-7 9.8-4-1.6-7-5.2-7-9.8V5.8z"/><path d="M9 12l2 2 4-4.5"/>`,

    /* 身分 */
    house:    `<path d="M3.5 11 12 4l8.5 7"/><path ${F} d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>`,
    key:      `<circle ${F} cx="8" cy="15" r="4"/><path d="M10.8 12.2l8.7-8.7M16 7l2.5 2.5M13.8 9.2l1.8 1.8"/>`,
    renewal:  `<path ${F} d="M3.5 20.5V11l5-3.5 5 3.5v9.5"/><path d="M13.5 20.5V4.5h7v16M2.5 20.5h19M16 8h2M16 11h2M16 14h2M7 13.5h3M7 16.5h3"/>`,
    scale:    `<circle cx="12" cy="4" r="1"/><path d="M12 5v15M7.5 20.5h9M5 7.5h14"/><path ${F} d="M2.5 14 5 8l2.5 6a2.5 2.5 0 0 1-5 0zM16.5 14 19 8l2.5 6a2.5 2.5 0 0 1-5 0z"/>`,
    setsquare:`<path ${F} d="M4 20.5V4l16.5 16.5z"/><path d="M8 16.5v-3l3 3zM4 8h2M4 12h2.5M4 16h2"/>`,
    gavel:    `<path ${F} d="M13.4 3.6l7 7-2.8 2.8-7-7z"/><path d="M14 10.2 5 19.2M13 21h8"/>`,
    calc:     `<rect ${F} x="5" y="2.5" width="14" height="19" rx="2"/><rect x="8" y="5.5" width="8" height="3.5" rx=".6"/><path stroke-width="2.2" d="M8.7 12.8h.01M12 12.8h.01M15.3 12.8h.01M8.7 15.8h.01M12 15.8h.01M15.3 15.8h.01M8.7 18.8h.01M12 18.8h.01M15.3 18.8h.01"/>`,
    deed:     `<path ${F} d="M6 2.5h8.5L19 7v14.5H6z"/><path d="M14.5 2.5V7H19M9 11h7M9 14h7M9 17h3.5"/><circle cx="15.5" cy="17.5" r="1.6"/>`,
    talk:     `<path ${F} d="M3.5 5.5h11v7h-6l-3 2.5v-2.5h-2z"/><path d="M9.5 14.5v2h6l3 2.5v-2.5h2v-7h-3"/>`,
    building: `<rect ${F} x="5" y="3" width="14" height="18" rx="1"/><path d="M8.5 7h2M13.5 7h2M8.5 10.5h2M13.5 10.5h2M8.5 14h2M13.5 14h2M10.5 21v-3.5h3V21M3 21h18"/>`,
    cap:      `<path ${F} d="M2.5 9 12 5l9.5 4-9.5 4z"/><path d="M6.5 11v4.5c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3V11M21.5 9v5"/>`,

    /* 島嶼工具列與控制 */
    tag:      `<path ${F} d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1l8.4 8.4-9.1 9.1z"/><circle cx="8" cy="8" r="1.5"/>`,
    current:  `<path d="M3 8.5c3-3 6 3 9 0s6 3 9 0M3 15.5c3-3 6 3 9 0s6 3 9 0"/>`,
    target:   `<circle cx="12" cy="12" r="7.5"/><circle ${F} cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>`,
    isle:     `<path ${F} d="M4 16c1.5-3.5 4.5-5.5 8-5.5s6.5 2 8 5.5z"/><path d="M12 10.5v-5M12 5.5c-1.8-1.6-4-1.5-5 .5M12 5.5c1.8-1.6 4-1.5 5 .5M2.5 19.5c1.6 0 2-.9 3.2-.9s1.6.9 3.2.9 2-.9 3.1-.9 1.6.9 3.2.9 2-.9 3.2-.9 1.5.9 3.1.9"/>`,
    play:     `<path ${S} d="M7.5 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L8.7 4.5a.8.8 0 0 0-1.2.7z"/>`,
    pause:    `<rect ${S} x="6.5" y="5" width="3.6" height="14" rx="1"/><rect ${S} x="13.9" y="5" width="3.6" height="14" rx="1"/>`,
    prev:     `<path d="M6 5.5v13"/><path ${S} d="M18 6.2v11.6a.8.8 0 0 1-1.2.7L9 13a1.2 1.2 0 0 1 0-2l7.8-5.5a.8.8 0 0 1 1.2.7z"/>`,
    next:     `<path d="M18 5.5v13"/><path ${S} d="M6 6.2v11.6a.8.8 0 0 0 1.2.7L15 13a1.2 1.2 0 0 0 0-2L7.2 5.5a.8.8 0 0 0-1.2.7z"/>`,
    search:   `<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5l5 5"/>`,
    close:    `<path d="M6 6l12 12M18 6 6 18"/>`,
    menu:     `<path d="M4 7h16M4 12h16M4 17h16"/>`
  };

  const sprite = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  sprite.setAttribute("aria-hidden", "true");
  sprite.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  sprite.innerHTML = Object.entries(I).map(([k, v]) =>
    `<symbol id="i-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${v}</symbol>`).join("");
  const mount = () => document.body.prepend(sprite);
  document.body ? mount() : document.addEventListener("DOMContentLoaded", mount);

  /* 找不到名稱時照原字顯示（例如資料裡仍填了 emoji），不會變成空白 */
  const icon = (name, cls = "") => I[name] ? `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`
    : String(name || "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  window.VI_ICON = icon;
  window.VI_ICONS = Object.keys(I);
})();
