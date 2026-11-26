/* ============================================================
   價值島 — 小遊戲「蓋高樓」
   在都更工地的卷宗裡按「來蓋一棟」才動態載入，平常不下載。
   樓層在基地上方來回移動，看準時機點一下（或按空白鍵）放下去；
   沒對齊的部分會被切掉掉下去，對得剛好是「完美」，連續完美樓板會長回來一點。
   蓋得越高等級越高：透天厝 → 公寓 → 華廈 → 電梯大樓 → 超高層 → 地標摩天樓。
   ============================================================ */
import * as THREE from 'three';
import { TOWERS, towerOf, nextTower, towerSvg, heightOf, fmtH } from './towers.js';
import { INFO, photoOf } from './tower-info.js';
const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const FLOOR_M = 3.5;          /* 一層 3.5 公尺 */
const H = 0.5;                /* 一層在畫面裡的高度 */
const STEP = 1;               /* 一次放下 1 層 */
const FOUND = 0.34;           /* 地基高度 */
const BASE = 2.3;             /* 一開始的樓板大小 */
const RANGE = 2.7;            /* 樓板來回移動的範圍 */
const tierOf = towerOf, nextTier = nextTower;
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const lerp = (a, b, t) => a + (b - a) * t;
const hm = n => fmtH(heightOf(n));   /* 第 n 層的高度（自動換單位） */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

export function startStackGame({ onClose } = {}) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* ---------- 畫面外框與文字 ---------- */
  const root = document.createElement('div');
  root.className = 'sg'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', '小遊戲：蓋高樓');
  root.innerHTML = `
    <div class="sg-sky"><i class="sg-stars"></i></div>
    <div class="sg-hud">
      <div class="sg-h"><b class="sg-m">0</b><span class="sg-unit">公尺</span></div>
      <div class="sg-t"><em class="sg-f">0 層</em><span class="sg-tier">空地</span></div>
      <div class="sg-next"><i></i></div><small class="sg-nx"></small>
    </div>
    <button class="sg-x" aria-label="回到島上">✕</button>
    <div class="sg-combo" aria-live="polite"></div>
    <div class="sg-banner" aria-live="polite"><span class="sg-bsil"></span><span><small>達到這個高度</small><b class="sg-bname"></b><em class="sg-bplace"></em></span></div>
    <p class="sg-hint">${matchMedia('(pointer:coarse)').matches ? '點一下畫面放下樓層' : '點一下畫面（或按空白鍵）放下樓層'}</p>
    <div class="sg-panel sg-start">
      <small class="sg-kick">都更工地・小遊戲</small>
      <h3>蓋高樓</h3>
      <p>樓板會在基地上方來回移動，看準時機點一下放下去。沒對齊的部分會被切掉；對得剛好是「完美」，連續完美，樓板會長回來一點。</p>
      <p class="sg-rule">一層 <b>3.5 公尺</b>，有中心線和目標框幫你對齊，差一點點也會自動吸過去。蓋到知名高樓的高度就能收進圖鑑；過了哈里發塔，還有高山、太空和行星等你解鎖。</p>
      <div class="sg-strip">${TOWERS.slice(1).filter(t => !t.special).map(t => towerSvg(t, 'mini')).join('')}<span class="sg-strip-q" title="828 公尺以上還有特別收藏">？</span></div>
      <p class="sg-best"></p>
      <div class="sg-btns"><button class="btn sg-go">開工</button><button class="btn ghost sg-dexbtn">高樓圖鑑</button></div>
    </div>
    <div class="sg-panel sg-end" hidden>
      <div class="sg-poster"><i class="sg-rays"></i><span class="sg-rsil"></span><span class="sg-seal"><span class="sg-seal-t"></span><b class="sg-seal-f"></b></span></div>
      <div class="sg-cert">
        <small class="sg-kick">完工證明</small>
        <p class="sg-res"></p>
        <h3 class="sg-tname"></h3>
        <p class="sg-chips"></p>
        <p class="sg-note"></p>
        <p class="sg-egg" hidden></p>
        <div class="sg-stats"></div>
        <div class="sg-goal"></div>
        <div class="sg-btns"><button class="btn sg-again">再蓋一棟</button><button class="btn ghost sg-dexbtn">高樓圖鑑</button><button class="btn ghost sg-back">回到島上</button></div>
      </div>
    </div>
    <div class="sg-panel sg-dex" hidden>
      <div class="sg-dex-h"><b>高樓圖鑑</b><span class="sg-dex-c"></span><button class="sg-dex-x" aria-label="關閉圖鑑">✕</button></div>
      <div class="sg-dex-grid"></div>
      <div class="sg-dex-d" hidden></div>
    </div>`;
  document.body.appendChild(root);
  document.documentElement.classList.add('sg-open');
  const $ = s => root.querySelector(s);
  const ui = { unit: $('.sg-unit'), m: $('.sg-m'), f: $('.sg-f'), tier: $('.sg-tier'), next: $('.sg-next i'), nx: $('.sg-nx'), combo: $('.sg-combo'), banner: $('.sg-banner'), hint: $('.sg-hint'), start: $('.sg-start'), end: $('.sg-end') };

  /* ---------- three.js ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  root.insertBefore(renderer.domElement, root.children[1]);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 600);
  const hemi = new THREE.HemisphereLight(0xfff6e8, 0x8fae7c, 1.35); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.1); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 60 }); sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
  const unit = new THREE.BoxGeometry(1, 1, 1);

  /* 基地：草地、圍籬、地基、旁邊一座慢慢轉的塔吊 */
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(9, 9.4, 0.6, 48), M(0x8ccb6e, { roughness: 0.95 })); ground.position.y = -0.3; ground.receiveShadow = true; scene.add(ground);
  const plot = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.04, 4.6), M(0xcdbf9c, { roughness: 1 })); plot.position.y = 0.02; plot.receiveShadow = true; scene.add(plot);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, f = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.32, 0.05), M(i % 2 ? 0xf2c14e : 0x3a3f46)); f.position.set(Math.sin(a) * 2.3, 0.18, Math.cos(a) * 2.3); f.rotation.y = a; f.castShadow = true; scene.add(f); }
  const found = new THREE.Mesh(unit, M(0x8f949a)); found.scale.set(BASE + 0.25, FOUND, BASE + 0.25); found.position.y = FOUND / 2; found.castShadow = found.receiveShadow = true; scene.add(found);
  const crane = new THREE.Group(); crane.position.set(-3.6, 0, -2.6); scene.add(crane);
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1, 0.16), M(0xf2a71b)); mast.geometry.translate(0, 0.5, 0); crane.add(mast);
  const jib = new THREE.Group(); crane.add(jib);
  { const arm = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.1, 0.12), M(0xf2a71b)), cw = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.3), M(0x6b6f76)); arm.position.x = 1.4; cw.position.set(-0.8, -0.05, 0); arm.castShadow = cw.castShadow = true; jib.add(arm, cw); }
  [ground, mast].forEach(m => { m.castShadow = true; });
  /* 一些樹與隔壁的矮房子，讓基地看起來在城市裡 */
  const deco = [[-5.5, 3.2, 0xf4d2c8, 1.1], [5.2, -3.8, 0xcfe3ef, 1.6], [4.8, 3.9, 0xe6e0f2, 0.9], [-4.6, -5, 0xf6e3b4, 1.3]];
  deco.forEach(([x, z, c, h]) => { const b = new THREE.Mesh(unit, M(c)); b.scale.set(1.3, h, 1.3); b.position.set(x, h / 2, z); b.castShadow = b.receiveShadow = true; scene.add(b); });
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + 0.3, r = 6.4 + (i % 3) * 0.7, t = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 2), M(i % 3 ? 0x6cc05a : 0xf6a9c4, { roughness: 0.85 })); t.position.set(Math.cos(a) * r, 0.55, Math.sin(a) * r); t.castShadow = true; scene.add(t); }
  /* 雲：蓋到一定高度會穿過雲層 */
  const cloudMat = M(0xffffff, { roughness: 0.95, emissive: 0xffffff, emissiveIntensity: 0.25, transparent: true, opacity: 0.92 });
  const clouds = [];
  [[12, 1], [24, -1], [42, 1], [66, -1], [100, 1], [135, -1], [175, 1], [220, -1], [300, 1], [380, -1], [470, 1], [560, -1], [700, 1], [850, -1], [1000, 1]].forEach(([fl, dir], k) => {
    const g = new THREE.Group(); const n = 5;
    for (let j = 0; j < n; j++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + (j % 2) * 0.35, 2), cloudMat); s.position.set((j - n / 2) * 1.05, (j % 2) * 0.25, (j % 3 - 1) * 0.5); s.scale.y = 0.72; g.add(s); }
    g.position.set(dir * 9 - (k % 2) * 4, FOUND + fl * H, -3.5 + (k % 3) * 2.2); g.userData = { dir, sp: 0.35 + (k % 3) * 0.12 }; scene.add(g); clouds.push(g);
  });

  /* ---------- 樓層 ---------- */
  const HB = H * STEP;
  const bodyGeo = new THREE.BoxGeometry(1, HB, 1).translate(0, HB / 2, 0);
  const bandGeo = new THREE.BoxGeometry(1.012, H * 0.42, 1.012);
  const slabGeo = new THREE.BoxGeometry(1.035, 0.03, 1.035);
  const slabMat = M(0xf4f1ea);
  const bands = [];
  /* 顏色：低樓層暖色磚牆，越往上越接近玻璃帷幕 */
  function floorColor(n) {
    const t = tierOf(n), nt = nextTier(n) || t;
    const a = new THREE.Color(t.col ? t.col[0] : '#f6e3c8'), b = new THREE.Color(nt.col ? nt.col[0] : '#f6e3c8');
    const u = nt === t ? 0 : clamp((n - t.n) / (nt.n - t.n));
    const c = a.lerp(b, u * 0.6); const hsl = {}; c.getHSL(hsl);
    c.setHSL(hsl.h, Math.min(0.75, hsl.s * 1.1), clamp(hsl.l, 0.45, 0.86) + ((n / STEP) % 2 ? 0.03 : -0.01));
    return c;
  }
  const accentOf = n => { const t = tierOf(n); return new THREE.Color(t.col ? t.col[1] : '#e4572e'); };
  function makeFloor(n, w, d) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: floorColor(n), roughness: lerp(0.7, 0.35, clamp(n / 200)), metalness: lerp(0, 0.2, clamp(n / 200)) }));
    const bm = new THREE.MeshStandardMaterial({ color: 0x2c4a63, roughness: 0.15, metalness: 0.4, emissive: 0xffd9a0, emissiveIntensity: 0 });
    const am = new THREE.MeshStandardMaterial({ color: accentOf(n), roughness: 0.5 });
    body.castShadow = body.receiveShadow = true; g.add(body);
    /* 兩層樓：各一排窗帶、各一道樓板（顏色取那棟名樓的陰影色） */
    for (let k = 0; k < STEP; k++) {
      const band = new THREE.Mesh(bandGeo, bm); band.position.y = H * k + H * 0.5; band.castShadow = true; g.add(band);
      const slab = new THREE.Mesh(slabGeo, k === STEP - 1 ? slabMat : am); slab.position.y = H * (k + 1) - 0.015; slab.castShadow = slab.receiveShadow = true; g.add(slab);
    }
    bands.push(bm); g.scale.set(w, 1, d); scene.add(g); return g;
  }

  /* ---------- 特效：完美的光圈、灰塵、碎片、彩帶 ---------- */
  const fx = [];
  function ring(y, w, d, color = 0xffffff) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.56, 4, 1).rotateX(-Math.PI / 2).rotateY(Math.PI / 4), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }));
    m.position.set(top.x, y + 0.02, top.z); m.scale.set(w * 1.41, 1, d * 1.41); scene.add(m);
    fx.push({ m, t: 0, life: 0.7, kind: 'ring', w, d });
  }
  const puffGeo = new THREE.IcosahedronGeometry(0.12, 1);
  function dust(x, y, z, n = 8, color = 0xe9e0cf) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(puffGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false }));
      const a = Math.random() * Math.PI * 2; m.position.set(x + Math.cos(a) * 0.3, y, z + Math.sin(a) * 0.3); scene.add(m);
      fx.push({ m, t: 0, life: 0.8 + Math.random() * 0.4, kind: 'puff', v: new THREE.Vector3(Math.cos(a) * 1.2, 0.6 + Math.random() * 0.6, Math.sin(a) * 1.2) });
    }
  }
  const confGeo = new THREE.PlaneGeometry(0.09, 0.16);
  const confCols = [0xe4572e, 0xf2c14e, 0x2b8a6e, 0x2a6f97, 0x7b4fa3, 0xffffff];
  function confetti(y, n = 46) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(confGeo, new THREE.MeshBasicMaterial({ color: confCols[i % confCols.length], side: THREE.DoubleSide, transparent: true }));
      m.position.set(top.x + (Math.random() - 0.5) * 0.6, y + 0.4, top.z + (Math.random() - 0.5) * 0.6); scene.add(m);
      const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 2.5;
      fx.push({ m, t: 0, life: 2.2, kind: 'conf', v: new THREE.Vector3(Math.cos(a) * s, 3 + Math.random() * 3, Math.sin(a) * s), av: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8) });
    }
  }
  const debris = [];
  /* 對齊輔助 */
  const guide = new THREE.Group(); scene.add(guide);
  const ghost = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xe4572e, transparent: true, opacity: 0.55, depthWrite: false });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1, 0.035), beamMat);
  const cross = new THREE.Group();
  [0, Math.PI / 2].forEach(r => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.012, 0.03), new THREE.MeshBasicMaterial({ color: 0xe4572e })); m.rotation.y = r; cross.add(m); });
  guide.add(ghost, beam, cross);
  const markMat = new THREE.MeshBasicMaterial({ color: 0xe4572e });
  const mark = new THREE.Group();
  [1, -1].forEach(sd => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, H * 1.9, 0.06), markMat); m.userData.sd = sd; mark.add(m); });
  scene.add(mark);
  function updateGuide() {
    if (!cur || over) { guide.visible = mark.visible = false; return; }
    guide.visible = mark.visible = true;
    const y = topY();
    ghost.scale.set(top.w, H, top.d); ghost.position.set(top.x, y + H / 2, top.z);
    beam.scale.set(1.6, 3.2, 1.6); beam.position.set(top.x, y + 1.6, top.z); cross.position.set(top.x, y + 0.012, top.z);
    /* 移動中的樓板：前後兩面中間各一道直線（對齊時會跟中心光線重疊） */
    const ax = cur.axis;
    mark.position.set(cur.x, y + H / 2, cur.z);
    mark.children.forEach(m => { if (ax === 'x') m.position.set(0, 0, m.userData.sd * (cur.d / 2 + 0.02)); else m.position.set(m.userData.sd * (cur.w / 2 + 0.02), 0, 0); });
    const off = Math.abs(cur[ax] - top[ax]), size = ax === 'x' ? cur.w : cur.d, near = off < Math.max(0.16, size * 0.1);
    beamMat.opacity = near ? 0.95 : 0.45; beamMat.color.set(near ? 0x2b8a6e : 0xe4572e); markMat.color.set(near ? 0x2b8a6e : 0xe4572e);
    ghost.material.color.set(near ? 0x7dffc0 : 0xffffff);
  }

  /* ---------- 遊戲狀態 ---------- */
  let stack = [], top = null, cur = null, n = 0, combo = 0, over = true, started = false, speed = 1.7, camY = 2, best = +(store.get('vi-stack-best3') || 0), lastTier = TOWERS[0];
  let dex = []; try { dex = JSON.parse(store.get('vi-stack-dex') || '[]'); } catch {}
  const topY = () => FOUND + n * H;
  function clearScene() {
    stack.forEach(s => scene.remove(s.g)); debris.forEach(d => scene.remove(d.g)); fx.forEach(f => scene.remove(f.m));
    stack = []; debris.length = 0; fx.length = 0; bands.length = 0;
    if (cur) scene.remove(cur.g); cur = null;
  }
  function reset() {
    clearScene();
    n = 0; combo = 0; speed = 1.7; lastTier = TOWERS[0];
    top = { x: 0, z: 0, w: BASE, d: BASE };
    spawn(); updateHud(); over = false; started = true;
    ui.hint.classList.remove('off'); ui.combo.textContent = ''; root.classList.remove('sg-over');
  }
  function spawn() {
    const axis = n % 2 ? 'z' : 'x', g = makeFloor(n + 1, top.w, top.d);
    cur = { g, axis, p: -RANGE, dir: 1, w: top.w, d: top.d, x: top.x, z: top.z };
    if (axis === 'x') cur.x = -RANGE; else cur.z = -RANGE;
    g.position.set(cur.x, topY(), cur.z);
  }
  function drop() {
    if (over || !cur) return;
    ui.hint.classList.add('off');
    const ax = cur.axis, size = ax === 'x' ? cur.w : cur.d, delta = cur[ax] - top[ax], ov = size - Math.abs(delta), y = topY();
    if (ov <= 0.02) { fall(cur.g, cur, ax, Math.sign(delta) || 1); cur = null; if (n === 0) setTimeout(() => showEgg('一層都沒蓋起來？', '沒關係，素地也有素地的價值。'), 300); return end(); }
    const hard = clamp((n - 237) / 400), tol = Math.max(0.16 - hard * 0.07, size * (0.1 - hard * 0.035));   /* 差一點點也算完美，自動吸過去 */
    let placed;
    if (Math.abs(delta) < tol) {
      /* 完美：對齊；連續三次以上，樓板長回來一點 */
      combo++;
      placed = { x: top.x, z: top.z, w: cur.w, d: cur.d };
      if (combo >= 2) { if (ax === 'x') placed.w = Math.min(BASE, placed.w + 0.14); else placed.d = Math.min(BASE, placed.d + 0.14); }
      ring(y + HB, placed.w, placed.d); if (combo >= 3) ring(y + HB, placed.w * 1.15, placed.d * 1.15, 0xf2c14e);
      ui.combo.textContent = combo >= 2 ? `完美 ×${combo}` : '完美！';
      if (combo === 10) showEgg('連續 10 次完美！', '工地主任跑來跟你要名片。');
      if (combo === 20) showEgg('連續 20 次完美！', '這棟樓的垂直度，連估價師的水平儀都挑不出毛病。'); ui.combo.classList.remove('pop'); void ui.combo.offsetWidth; ui.combo.classList.add('pop');
    } else {
      combo = 0; ui.combo.textContent = '';
      placed = { x: top.x, z: top.z, w: cur.w, d: cur.d };
      if (ax === 'x') { placed.w = ov; placed.x = top.x + delta / 2; } else { placed.d = ov; placed.z = top.z + delta / 2; }
      /* 切掉的那一塊掉下去 */
      const cut = { w: cur.w, d: cur.d, x: cur.x, z: cur.z }, sd = Math.sign(delta);
      if (ax === 'x') { cut.w = Math.abs(delta); cut.x = placed.x + sd * (ov / 2 + cut.w / 2); } else { cut.d = Math.abs(delta); cut.z = placed.z + sd * (ov / 2 + cut.d / 2); }
      const cg = makeFloor(n + 1, cut.w, cut.d); cg.position.set(cut.x, y, cut.z); fall(cg, cut, ax, sd);
    }
    cur.g.scale.set(placed.w, 1, placed.d); cur.g.position.set(placed.x, y, placed.z);
    cur.g.userData.land = 0;   /* 落下時壓一下 */
    stack.push({ g: cur.g, ...placed });
    dust(placed.x, y, placed.z, 6);
    n += STEP; top = placed; speed = 1.7 + 1.6 * (1 - Math.exp(-n / 120)) + (n > 237 ? Math.min(1.6, (n - 237) / 250) : 0);
    const t = tierOf(n);
    if (n === 101) showEgg('你蓋到第 101 層了！', '在台北，101 這個數字很特別。');
    if (t !== lastTier) { lastTier = t; showBanner(t); flyBy(t); confetti(topY()); if (!dex.includes(t.id)) { dex.push(t.id); store.set('vi-stack-dex', JSON.stringify(dex)); } }
    updateHud(); spawn();
  }
  function fall(g, r, ax, sd) {
    const v = new THREE.Vector3(ax === 'x' ? sd * 1.6 : 0, 0.5, ax === 'z' ? sd * 1.6 : 0), av = new THREE.Vector3(ax === 'z' ? sd * 2.2 : 0, 0, ax === 'x' ? -sd * 2.2 : 0);
    debris.push({ g, v, av, t: 0 });
  }
  /* 星球從旁邊飄過 */
  const BODY = { moon: [0xe6e4dc, 3.5], mars: [0xe07b4f, 3], sun: [0xffc94a, 7], jupiter: [0xe2b98a, 6], saturn: [0xefdca6, 5], neptune: [0x5d8fe0, 4.5], proxima: [0xff8a6a, 4], geo: [0x6fb1e0, 6], karman: [0x6fb1e0, 9] };
  const bodies = [];
  function flyBy(t) {
    const b = BODY[t.id]; if (!b) return;
    const m = new THREE.Mesh(new THREE.SphereGeometry(b[1], 32, 24), new THREE.MeshStandardMaterial({ color: b[0], roughness: 0.8, emissive: t.id === 'sun' || t.id === 'proxima' ? b[0] : 0x000000, emissiveIntensity: t.id === 'sun' || t.id === 'proxima' ? 0.9 : 0 }));
    if (t.id === 'saturn') { const ring = new THREE.Mesh(new THREE.RingGeometry(b[1] * 1.35, b[1] * 2, 48), new THREE.MeshStandardMaterial({ color: 0xd9c48e, side: THREE.DoubleSide, roughness: 0.9 })); ring.rotation.x = 1.2; m.add(ring); }
    m.position.set(-16, topY() + 4, -12); scene.add(m); bodies.push({ m, t: 0 });
  }
  function showEgg(h, msg) {
    const el = document.createElement('div'); el.className = 'sg-eggpop'; el.innerHTML = `<b>彩蛋</b><strong></strong><span></span>`;
    el.querySelector('strong').textContent = h; el.querySelector('span').textContent = msg; root.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }
  function showBanner(t) {
    root.querySelector('.sg-bsil').innerHTML = towerSvg(t); root.querySelector('.sg-bname').textContent = t.name; root.querySelector('.sg-bplace').textContent = t.place + `・約 ${fmtH(t.h)}`;
    ui.banner.classList.remove('on'); void ui.banner.offsetWidth; ui.banner.classList.add('on');
  }
  function updateHud() {
    const t = tierOf(n), nt = nextTier(n);
    { const hs = hm(n).split(' '); ui.m.textContent = hs[0]; ui.unit.textContent = hs[1]; } ui.f.textContent = n + ' 層'; ui.tier.textContent = t.name;
    const p = nt ? (n - t.n) / (nt.n - t.n) : 1; ui.next.style.width = (clamp(p) * 100) + '%';
    ui.nx.textContent = nt ? `再 ${nt.n - n} 層到「${nt.name}」（${fmtH(nt.h)}）` : '你已經蓋到宇宙的盡頭了！';
  }
  function end() {
    over = true; root.classList.add('sg-over');
    const t = tierOf(n), isBest = n > best; if (isBest) { best = n; store.set('vi-stack-best3', String(n)); }
    setTimeout(() => {
      ui.end.hidden = false; ui.end.classList.add('on');
      ui.end.style.setProperty('--tb', t.col ? t.col[0] : '#f6e3c8'); ui.end.style.setProperty('--ts', t.col ? t.col[1] : '#e4572e');
      $('.sg-seal-t').textContent = hm(n); $('.sg-seal-f').textContent = n + ' 層';
      $('.sg-rsil').innerHTML = t.svg ? towerSvg(t, 'big') : '';
      $('.sg-res').textContent = t.n ? '恭喜你蓋出了' : '這次沒蓋起來';
      $('.sg-tname').textContent = t.n ? `${t.name}的高度！` : '再試一次吧';
      $('.sg-chips').innerHTML = t.n ? [t.place, t.year, `約 ${fmtH(t.h)}`].filter(Boolean).map(x => `<span>${x}</span>`).join('') + (t.title ? `<span class="hl">${t.title}</span>` : '') : '';
      $('.sg-note').textContent = t.note;
      const eg = $('.sg-egg'); eg.hidden = !t.egg; eg.innerHTML = t.egg ? `<b>彩蛋</b>${t.egg}` : '';
      $('.sg-stats').innerHTML = `<span><b>${n}</b>層</span><span><b>${hm(n).split(' ')[0]}</b>${hm(n).split(' ')[1]}</span><span class="${isBest && n ? 'nb' : ''}"><b>${best}</b>${isBest && n ? '新紀錄！' : '最高紀錄'}</span>`;
      const nt = nextTier(n);
      $('.sg-goal').innerHTML = nt ? `${towerSvg(nt, 'tiny')}<span>下一個目標：<b>${nt.name}</b>（${fmtH(nt.h)}），還差 ${nt.n - n} 層</span>` : '<span>你已經蓋到世界最高的高度了！</span>';
      ui.end.querySelector('.sg-again').focus({ preventScroll: true });
    }, 900);
  }
  ui.start.querySelector('.sg-best').textContent = best ? `你的最高紀錄：${best} 層（${hm(best)}，${tierOf(best).name}）` : '';

  /* ---------- 高樓圖鑑 ---------- */
  const dexEl = $('.sg-dex'), grid = dexEl.querySelector('.sg-dex-grid'), det = dexEl.querySelector('.sg-dex-d');
  let dexFrom = null;
  function openDex(from) {
    dexFrom = from; from.hidden = true; dexEl.hidden = false; det.hidden = true; grid.hidden = false;
    const list = TOWERS.slice(1), got = list.filter(t => dex.includes(t.id) || best >= t.n);
    dexEl.querySelector('.sg-dex-c').textContent = `已收集 ${got.length} / ${list.length}`;
    grid.innerHTML = list.map(t => { const on = got.includes(t); return `<button class="sg-card${on ? ' on' : ''}${t.special ? ' sp' : ''}${t.space ? ' space' : ''}" data-id="${t.id}" aria-label="${on ? t.name : '還沒解鎖'}">${towerSvg(t)}<b>${on ? t.name : '？？？'}</b><small>${on ? t.place : `蓋到 ${t.n} 層解鎖`}</small><em>${fmtH(t.h)}</em></button>`; }).join('');
  }
  grid.addEventListener('click', e => {
    const b = e.target.closest('.sg-card'); if (!b) return;
    const t = TOWERS.find(x => x.id === b.dataset.id), on = b.classList.contains('on');
    const inf = INFO[t.id], ph = on ? photoOf(t.id) : null;
    det.innerHTML = `<button class="sg-dex-back">← 回圖鑑</button>
      <article class="sg-dd3">
        ${ph ? `<figure class="sg-hero"><img src="${ph.src}" alt="${esc(t.name)}的照片" loading="lazy" decoding="async"><figcaption>照片：<a href="${ph.url}" target="_blank" rel="noopener noreferrer">${esc(ph.by)}</a>・${esc(ph.lic)}・Wikimedia Commons</figcaption></figure>`
             : `<div class="sg-hero sg-hero-art">${towerSvg(t, on ? 'big' : 'big locked')}</div>`}
        <header class="sg-dd-head">
          ${ph ? `<span class="sg-dd-ic">${towerSvg(t, 'ic')}</span>` : ''}
          <div><small>${on ? esc(t.place) : '還沒解鎖'}</small><h4>${on ? esc(t.name) : '？？？'}</h4>
          <p class="sg-dt">${on ? [t.title, t.year].filter(Boolean).map(esc).join('・') : `蓋到 ${t.n} 層（${hm(t.n)}）就能解鎖`}</p></div>
        </header>
        ${on && inf ? `<dl class="sg-facts">${inf.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : `<p class="sg-dh"><b>${fmtH(t.h)}</b> ＝ 第 <b>${t.n}</b> 層</p>`}
        ${on && inf ? `<p class="sg-sci">${esc(inf.sci)}</p>` : ''}
        ${on ? `<p class="sg-nt">${esc(t.note)}</p>` : ''}
        ${on && t.egg ? `<p class="sg-egg"><b>彩蛋</b>${esc(t.egg)}</p>` : ''}
        ${on ? `<p class="sg-dh2">在遊戲裡：第 <b>${t.n}</b> 層解鎖（${fmtH(t.h)}）</p>` : ''}
      </article>`;
    grid.hidden = true; det.hidden = false;
  });
  det.addEventListener('click', e => { if (e.target.closest('.sg-dex-back')) { det.hidden = true; grid.hidden = false; } });
  dexEl.querySelector('.sg-dex-x').addEventListener('click', () => { dexEl.hidden = true; if (dexFrom) dexFrom.hidden = false; });
  root.querySelectorAll('.sg-dexbtn').forEach(b => b.addEventListener('click', () => openDex(b.closest('.sg-panel'))));

  /* ---------- 輸入 ---------- */
  const onDown = e => { if (e.target.closest('button,.sg-panel')) return; if (!dexEl.hidden) return; if (!over) { e.preventDefault(); drop(); } };
  const onKey = e => {
    if (e.key === 'Escape') { if (!dexEl.hidden) { dexEl.querySelector('.sg-dex-x').click(); return; } close(); return; }
    if (e.key === ' ' || e.key === 'Enter') { if (!over) { e.preventDefault(); drop(); } else if (!ui.end.hidden && e.key === ' ') { e.preventDefault(); again(); } }
  };
  function begin() { ui.start.hidden = true; reset(); }
  function again() { ui.end.hidden = true; ui.end.classList.remove('on'); reset(); }
  root.addEventListener('pointerdown', onDown);
  window.addEventListener('keydown', onKey);
  $('.sg-go').addEventListener('click', begin);
  $('.sg-again').addEventListener('click', again);
  $('.sg-back').addEventListener('click', () => close());
  $('.sg-x').addEventListener('click', () => close());
  setTimeout(() => $('.sg-go').focus({ preventScroll: true }), 50);

  /* ---------- 尺寸 ---------- */
  function resize() {
    const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h); camera.aspect = w / h;
    camera.fov = w >= h ? 38 : Math.min(62, 2 * Math.atan(Math.tan(38 * Math.PI / 360) / (w / h) * 0.8) * 180 / Math.PI);
    camera.updateProjectionMatrix();
  }
  resize(); window.addEventListener('resize', resize);

  /* ---------- 天空：越高越接近傍晚，再高變成夜晚（窗戶亮燈、星星） ---------- */
  const SKY = [[0, '#bfe3f5', '#fdf1de'], [65, '#9fc8ec', '#ffe6c7'], [120, '#f3a47c', '#6d77b3'], [180, '#1d2a55', '#3a4d86'], [280, '#0f1a44', '#2c3f7a'], [440, '#1a0f3d', '#4b2f7a'], [580, '#2a1a5e', '#e88aa8'], [319, '#0b1a4a', '#3b5fa0'], [330, '#060a24', '#1a2a5a'], [361, '#020308', '#0a0f24'], [900, '#020308', '#0a0f24']];
  const hex = c => new THREE.Color(c);
  let night = 0;
  function sky(fl) {
    let i = 0; while (i < SKY.length - 2 && fl > SKY[i + 1][0]) i++;
    const [a0, t0, b0] = SKY[i], [a1, t1, b1] = SKY[i + 1], u = clamp((fl - a0) / (a1 - a0));
    const top = hex(t0).lerp(hex(t1), u), bot = hex(b0).lerp(hex(b1), u);
    root.style.setProperty('--sg-top', '#' + top.getHexString()); root.style.setProperty('--sg-bot', '#' + bot.getHexString());
    const nn = fl > 330 ? 1 : clamp((fl - 115) / 60) * (fl > 260 && fl < 300 ? 0.6 : 1);
    if (Math.abs(nn - night) > 0.01) { night = nn; root.style.setProperty('--sg-stars', String(nn)); bands.forEach(m => { m.emissiveIntensity = nn * 1.1; }); sun.intensity = lerp(2.1, 0.5, nn); hemi.intensity = lerp(1.35, 0.6, nn); }
  }

  /* ---------- 每一格 ---------- */
  const clock = new THREE.Clock(); let raf = 0, T = 0;
  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05); T += dt;
    if (cur && !over) {
      const ax = cur.axis; cur[ax] += cur.dir * speed * dt;
      if (cur[ax] > RANGE) { cur[ax] = RANGE; cur.dir = -1; } else if (cur[ax] < -RANGE) { cur[ax] = -RANGE; cur.dir = 1; }
      cur.g.position.set(cur.x, topY() + Math.sin(T * 6) * 0.01, cur.z);
    }
    if (!over) for (let i = 0; i < stack.length - 30; i++) stack[i].g.visible = stack[i].g.position.y > camY - 16;
    else if (stack.length > 30 && !stack[0].g.visible) stack.forEach(q => { q.g.visible = true; });
    updateGuide();
    /* 剛放下的樓層：壓一下再彈回來 */
    for (let i = Math.max(0, stack.length - 3); i < stack.length; i++) { const s = stack[i], u = s.g.userData; if (u.land === undefined || u.land >= 1) continue; u.land = Math.min(1, u.land + dt * 5); const k = Math.sin(u.land * Math.PI) * 0.12; s.g.scale.set(s.w * (1 + k * 0.25), 1 - k, s.d * (1 + k * 0.25)); }
    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i]; d.t += dt; d.v.y -= 11 * dt; d.g.position.addScaledVector(d.v, dt);
      d.g.rotation.x += d.av.x * dt; d.g.rotation.z += d.av.z * dt;
      if (d.g.position.y < -14) { scene.remove(d.g); debris.splice(i, 1); }
    }
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i]; f.t += dt; const u = f.t / f.life;
      if (u >= 1) { scene.remove(f.m); f.m.material.dispose(); fx.splice(i, 1); continue; }
      if (f.kind === 'ring') { const s = 1 + u * 0.7; f.m.scale.set(f.w * 1.41 * s, 1, f.d * 1.41 * s); f.m.material.opacity = 0.9 * (1 - u); }
      else if (f.kind === 'puff') { f.m.position.addScaledVector(f.v, dt); f.v.multiplyScalar(0.94); f.m.scale.setScalar(1 + u * 2); f.m.material.opacity = 0.6 * (1 - u); }
      else { f.v.y -= 6 * dt; f.v.multiplyScalar(0.985); f.m.position.addScaledVector(f.v, dt); f.m.rotation.x += f.av.x * dt; f.m.rotation.y += f.av.y * dt; f.m.material.opacity = 1 - Math.max(0, u - 0.7) / 0.3; }
    }
    jib.rotation.y = Math.sin(T * 0.25) * 1.2; mast.scale.y = Math.max(5, topY() + 1.6); jib.position.y = mast.scale.y;
    for (let i = bodies.length - 1; i >= 0; i--) { const o = bodies[i]; o.t += dt; o.m.position.x += dt * 1.6; o.m.position.y += (topY() + 2 - o.m.position.y) * Math.min(1, dt * 0.6); o.m.rotation.y += dt * 0.2; if (o.t > 26) { scene.remove(o.m); bodies.splice(i, 1); } }
    clouds.forEach(c => { c.position.x += c.userData.dir * c.userData.sp * dt; if (c.position.x > 14) c.position.x = -14; if (c.position.x < -14) c.position.x = 14; });
    /* 鏡頭：跟著樓頂往上；遊戲結束時拉遠看整棟 */
    const h = topY(), want = over && started ? Math.max(2, h * 0.5) : h + 0.9;
    camY = lerp(camY, want, 1 - Math.exp(-dt * (over ? 1.6 : 4)));
    const dist = over && started ? Math.max(10, h * 1.25 + 5) : 9.5;
    const ang = 0.78 + (reduce ? 0 : Math.sin(T * 0.12) * 0.08);
    const lift = over && started ? 0.22 : 0.5;
    camera.position.set(Math.sin(ang) * dist, camY + dist * lift, Math.cos(ang) * dist); camera.lookAt(0, camY, 0);
    sun.position.set(5, camY + 9, 4); sun.target.position.set(0, camY - 1, 0);
    sky(h > FOUND ? (h - FOUND) / H : 0);
    renderer.render(scene, camera);
  }
  frame();

  let closed = false;
  function close() {
    if (closed) return; closed = true;
    cancelAnimationFrame(raf); window.removeEventListener('resize', resize); window.removeEventListener('keydown', onKey);
    clearScene();
    scene.traverse(o => { if (o.isMesh) { o.geometry?.dispose?.(); o.material?.dispose?.(); } });
    renderer.dispose(); renderer.forceContextLoss?.();
    root.remove(); document.documentElement.classList.remove('sg-open');
    onClose?.();
  }
  return { close };
}
