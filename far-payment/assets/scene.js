/* ============================================================
   容積代金學堂 — 首頁雙塔場景（SVG）
   左：未含容積移入（11F）；右：含容積移入（14F，頂上三層為移入容積）
   六步導覽：法定容積 → 移入容積 → 兩套估價 → 差額 → 三家查估 → 回到公保地
   ============================================================ */
(function(){
  const D = window.FP, C = window.CALC, U = window.FPU, $ = U.$, $$ = U.$$;
  const demo = D.demo, r = C.calc(demo);
  const W = 640, H = 430, G = 352, FH = 17, FW = 128;
  const bx = { b: 96, a: 336 };
  const svg = $("#scene"); if (!svg) return;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const bldg = (x, n, gold, key) => {
    let s = `<g class="bldg ${key}">`;
    for (let i = 0; i < n; i++) {
      const y = G - FH * (i + 1), isG = i >= gold;
      s += `<g class="flr" style="animation-delay:${i * 70 + (key === "a" ? 600 : 0)}ms"><rect x="${x}" y="${y}" width="${FW}" height="${FH - 1.5}" rx="1.5" fill="${isG ? "#e2a24a" : (key === "a" ? "#2a8c5c" : "#5f7bc0")}" opacity="${isG ? 1 : .92 - i * .012}"/>`;
      for (let w = 0; w < 6; w++) s += `<rect x="${x + 10 + w * 19}" y="${y + 4}" width="9" height="${FH - 10}" rx="1" fill="#fff" opacity="${isG ? .55 : .35}"/>`;
      s += `</g>`;
    }
    s += `<rect x="${x - 6}" y="${G - FH * n - 6}" width="${FW + 12}" height="6" rx="2" fill="${key === "a" ? "#1f6b46" : "#4b63a0"}" class="flr" style="animation-delay:${n * 70 + 100}ms"/>`;
    s += `<rect x="${x - 4}" y="${G}" width="${FW + 8}" height="6" fill="#cbbfa8"/></g>`;
    return s;
  };
  const bef = demo.bef.floorsUp, aft = demo.aft.floorsUp;
  const topA = G - FH * aft, topB = G - FH * bef;
  svg.innerHTML = `
    <defs><linearGradient id="gnd" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e5dcc7"/><stop offset="1" stop-color="#d4c9ae"/></linearGradient></defs>
    <g class="cloud"><ellipse cx="60" cy="60" rx="38" ry="12" fill="#fff" opacity=".8"/><ellipse cx="85" cy="52" rx="24" ry="12" fill="#fff" opacity=".8"/></g>
    <g class="cloud c2"><ellipse cx="20" cy="110" rx="30" ry="9" fill="#fff" opacity=".7"/></g>
    <rect x="0" y="${G}" width="${W}" height="${H - G}" fill="url(#gnd)"/>
    <g id="road" opacity="0"><rect x="0" y="${G + 20}" width="${W}" height="26" fill="#9a9389"/><line x1="0" y1="${G + 33}" x2="${W}" y2="${G + 33}" stroke="#f7f4ed" stroke-width="2" stroke-dasharray="14 12"/>
      <g id="park"><rect x="${W - 150}" y="${G - 46}" width="130" height="46" rx="4" fill="#9fc99a" opacity=".9"/><circle cx="${W - 115}" cy="${G - 46}" r="14" fill="#5f9a56"/><rect x="${W - 117}" y="${G - 40}" width="4" height="34" fill="#6b4f2a"/><circle cx="${W - 60}" cy="${G - 42}" r="11" fill="#5f9a56"/><rect x="${W - 62}" y="${G - 36}" width="4" height="30" fill="#6b4f2a"/></g>
      <text x="${W - 85}" y="${G + 62}" text-anchor="middle" class="sub">私有公保地</text><text x="60" y="${G + 62}" class="sub">同一主要計畫區</text></g>
    <g class="crane" id="crane" opacity="0"><rect x="418" y="60" width="4" height="${G - 60}" fill="#5b5248"/><rect x="330" y="56" width="180" height="5" fill="#5b5248"/><line x1="420" y1="56" x2="470" y2="30" stroke="#5b5248" stroke-width="3"/><line x1="470" y1="30" x2="505" y2="56" stroke="#5b5248" stroke-width="3"/><line x1="500" y1="61" x2="500" y2="${topA - 24}" stroke="#5b5248" stroke-width="1.5"/><rect x="492" y="${topA - 24}" width="16" height="12" fill="#e2a24a" stroke="#5b5248"/></g>
    ${bldg(bx.b, bef, 99, "b")}
    ${bldg(bx.a, aft, bef, "a")}
    <g id="brace" opacity="0"><path d="M${bx.a + FW + 14},${topA} h10 v${FH * (aft - bef)} h-10" fill="none" stroke="#c06a1a" stroke-width="2"/><text x="${bx.a + FW + 32}" y="${topA + FH * (aft - bef) / 2 - 4}" class="lbl" fill="#c06a1a">移入容積</text><text x="${bx.a + FW + 32}" y="${topA + FH * (aft - bef) / 2 + 10}" class="sub">${demo.inM2.toLocaleString()} ㎡ ／ 多 ${aft - bef} 層</text></g>
    <g id="lb"><text x="${bx.b + FW / 2}" y="${G + 24}" text-anchor="middle" class="lbl">未含容積移入　${bef}F／B${demo.bef.floorsDown}</text><text x="${bx.b + FW / 2}" y="${G + 38}" text-anchor="middle" class="sub">BEFORE</text></g>
    <g id="la"><text x="${bx.a + FW / 2}" y="${G + 24}" text-anchor="middle" class="lbl">含容積移入　${aft}F／B${demo.aft.floorsDown}</text><text x="${bx.a + FW / 2}" y="${G + 38}" text-anchor="middle" class="sub">AFTER</text></g>
    <g id="pb" opacity="0"><rect x="${bx.b + 14}" y="${topB - 34}" width="100" height="24" rx="6" fill="#1c1b18"/><text x="${bx.b + FW / 2}" y="${topB - 17}" text-anchor="middle" class="val" fill="#fff">${U.yi(r.b.total)}</text><text x="${bx.b + FW / 2}" y="${topB - 40}" text-anchor="middle" class="sub">土地價格</text></g>
    <g id="pa" opacity="0"><rect x="${bx.a + 14}" y="${topA - 34}" width="100" height="24" rx="6" fill="#1c1b18"/><text x="${bx.a + FW / 2}" y="${topA - 17}" text-anchor="middle" class="val" fill="#fff">${U.yi(r.a.total)}</text><text x="${bx.a + FW / 2}" y="${topA - 40}" text-anchor="middle" class="sub">土地價格</text></g>
    <g id="fee" opacity="0"><line x1="${bx.b + FW}" y1="${topB - 22}" x2="${bx.a}" y2="${topA - 22}" stroke="#c06a1a" stroke-width="1.5" stroke-dasharray="4 4"/><rect x="${(bx.b + FW + bx.a) / 2 - 62}" y="${(topA + topB) / 2 - 40}" width="124" height="34" rx="8" fill="#c06a1a"/><text x="${(bx.b + FW + bx.a) / 2}" y="${(topA + topB) / 2 - 25}" text-anchor="middle" class="sub" fill="#fff" style="fill:#fff">容積代金</text><text x="${(bx.b + FW + bx.a) / 2}" y="${(topA + topB) / 2 - 12}" text-anchor="middle" class="val" fill="#fff" style="fill:#fff;font-weight:700">${U.yi(r.fee)}</text></g>
    <g id="three" opacity="0">${[0, 1, 2].map(i => `<g transform="translate(${bx.b + FW + 22 + i * 24},${G - 70})"><rect width="18" height="24" rx="2" fill="#fff" stroke="#8b8478"/><line x1="4" y1="7" x2="14" y2="7" stroke="#8b8478"/><line x1="4" y1="12" x2="14" y2="12" stroke="#8b8478"/><line x1="4" y1="17" x2="11" y2="17" stroke="#8b8478"/></g>`).join("")}<text x="${bx.b + FW + 53}" y="${G - 78}" text-anchor="middle" class="sub">三家估價報告</text><circle class="ring" cx="${bx.b + FW + 53}" cy="${G - 58}" r="44" fill="none" stroke="#c06a1a" stroke-width="1.5" stroke-dasharray="3 5"/></g>
    <g id="flowarrow" opacity="0"><path d="M${(bx.b + FW + bx.a) / 2},${(topA + topB) / 2 - 2} C ${(bx.b + FW + bx.a) / 2},${G - 20} ${W - 200},${G + 40} ${W - 150},${G + 10}" fill="none" stroke="#c06a1a" stroke-width="2" stroke-dasharray="6 6"/><polygon points="${W - 150},${G + 10} ${W - 162},${G + 6} ${W - 156},${G + 18}" fill="#c06a1a"/></g>
  `;

  const steps = [
    { t: "01 法定容積", c: `同一塊地，只用法定容積與毋須估價的獎勵，實際設計蓋出 ${bef} 層。這是「未含容積移入」的情境，不是上限額度，而是實際設計額度。`, on: ["b-only"] },
    { t: "02 移入容積", c: `從公保地、古蹟或代金移進來的容積，讓同一塊地多蓋 ${aft - bef} 層。範本要求容移前情境用「削頂」重建：建蔽率不變，少掉的容積從頂層依次扣。`, on: ["crane", "brace"] },
    { t: "03 兩套估價", c: `估價師用土地開發分析法，分別算出兩個情境的土地價格：V ＝ S ÷(1＋R)÷(1＋i) −(C＋M)。單價取位至千位，再乘土地坪數。`, on: ["pb", "pa", "brace"] },
    { t: "04 差額就是代金", c: `容積代金 ＝ ${U.yi(r.a.total)} − ${U.yi(r.b.total)} ＝ ${U.yi(r.fee)}元。這是示範案的數字，拉到下方可以親手改參數。`, on: ["pb", "pa", "fee"] },
    { t: "05 三家查估、三層審議", c: "主管機關委託三家以上估價者查估，臺北市再經公會協檢、專案小組、審議委員會三層審議後評定。", on: ["pb", "pa", "fee", "three"] },
    { t: "06 代金回到公保地", c: "代金專款專用：標購同一主要計畫區的私有公共設施保留地。發展權可以被分離、移轉、定價，代金收入要還給公保地地主。", on: ["fee", "road", "flowarrow"] }
  ];
  const ids = ["crane", "brace", "pb", "pa", "fee", "three", "road", "flowarrow"];
  let cur = -1, timer = null;
  const cap = $("#sceneCap"), btns = $("#sceneSteps");
  btns.innerHTML = steps.map((s, i) => `<button data-i="${i}">${s.t.slice(0, 2)}</button>`).join("");
  function show(i) {
    cur = i; const s = steps[i];
    ids.forEach(id => { const el = svg.querySelector("#" + id); if (el) el.style.opacity = s.on.includes(id) ? 1 : 0; el && (el.style.transition = "opacity .5s"); });
    svg.querySelector(".bldg.a").style.opacity = s.on.includes("b-only") ? .18 : 1;
    svg.querySelector("#la").style.opacity = s.on.includes("b-only") ? .3 : 1;
    svg.querySelector(".bldg.a").style.transition = "opacity .5s";
    cap.innerHTML = `<b>${s.t}</b><span>${s.c}</span>`;
    $$("#sceneSteps button").forEach((b, k) => b.classList.toggle("on", k === i));
    const bar = $("#sceneBar"); if (bar) bar.style.width = ((i + 1) / steps.length * 100) + "%";
  }
  function play() { stop(); timer = setInterval(() => show((cur + 1) % steps.length), 5200); $("#scenePlay").textContent = "⏸ 暫停"; }
  function stop() { clearInterval(timer); timer = null; $("#scenePlay").textContent = "▶ 自動播放"; }
  $$("#sceneSteps button").forEach(b => b.onclick = () => { stop(); show(+b.dataset.i); });
  $("#scenePlay").onclick = () => timer ? stop() : play();
  $("#sceneNext").onclick = () => { stop(); show((cur + 1) % steps.length); };
  setTimeout(() => { show(0); play(); }, 1500);

  /* 首頁數字 */
  const st = $("#heroStats");
  if (st) st.innerHTML = `<div><b>${U.yi(r.b.total)}</b><span>未含容積移入之基地價格</span></div><div><b>${U.yi(r.a.total)}</b><span>含容積移入之基地價格</span></div><div><b>${U.yi(r.fee)}</b><span>容積代金（示範案）</span></div>`;
})();
