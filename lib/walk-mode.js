/* ============================================================
   價值島 — 走進島上（遊戲導覽模式，原型）
   按下「走進島上」才由 island-scene.js 動態載入，平常不下載。
   一個戴安全帽、穿反光背心的估價師小人：鍵盤（WASD／方向鍵）、手機搖桿或點地面走路，會自己找路繞過建物；
   有身分的路人頭上有對話泡泡，走近可以聊天；走近建物可以「進去看看」（打開勘查卷宗、蓋章）。
   透過 document 事件通知頁面：
     island:walk  { on }                               進入／離開
     island:near  { kind: 'npc'|'spot'|null, id, label } 身邊有沒有可以互動的對象
   ============================================================ */
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

/**
 * ctx：island-scene.js 傳進來的場景與工具
 *   scene, island, camera, controls, renderer, hero, groundY(x,z), tOf(x,z), P(t,a),
 *   spotObjs { id: Object3D[] }, people Group[], trees [{x,z}],
 *   npcs [{ id, who, at, hello }]：可以對話的路人；ambient [字串]：一般路人偶爾說的話
 *   onExit()：離開後要做的事（鏡頭回全景、恢復轉動）
 */
export function createWalk(ctx) {
  const { island, camera, controls, renderer, hero, groundY, tOf, P, spotObjs, people, trees, npcs } = ctx;
  const ambient = ctx.ambient || [];
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const SPEED = 2.5, R = 0.16, NEAR_SPOT = 0.7, NEAR_NPC = 1.3;   /* 走路速度：原本 2.1 的 1.2 倍 */

  /* ============================================================
     小人：跟島上路人同一種「豆子人」（沒有腳、用跳的），一樣大小；
     多了黃色安全帽、橘色反光背心、識別證，小手上拿著勘查板
     ============================================================ */
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.72, ...o });
  const SKIN = 0xf5d2b8;
  const player = new THREE.Group();
  const body = new THREE.Group(); player.add(body);
  const part = (parent, geo, c, x, y, z, o) => { const m = new THREE.Mesh(geo, typeof c === 'number' ? mat(c, o) : c); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const legs = [];   /* 沒有腳（保留空陣列，飛行姿勢的程式不用改） */
  /* 身體：跟路人一樣的膠囊，外面套反光背心 */
  part(body, new THREE.CapsuleGeometry(0.13, 0.26, 6, 18), 0x2f6f9a, 0, 0.27, 0);
  part(body, new THREE.CapsuleGeometry(0.137, 0.13, 6, 18), 0xf08a2c, 0, 0.25, 0);
  [0.2, 0.3].forEach(y => part(body, new THREE.CylinderGeometry(0.14, 0.14, 0.02, 24, 1, true), mat(0xf4f1e8, { emissive: 0x333333 }), 0, y, 0));
  part(body, new THREE.BoxGeometry(0.05, 0.036, 0.01), 0xfaf6ea, -0.055, 0.34, 0.128);
  /* 小手：圓圓的，走路時跟著跳一下一下地拍 */
  const arms = [-1, 1].map(sd => {
    const sh = new THREE.Group(); sh.position.set(sd * 0.13, 0.33, 0); body.add(sh);
    part(sh, new THREE.SphereGeometry(0.048, 14, 10), 0x2f6f9a, sd * 0.02, -0.05, 0).scale.set(0.85, 1.3, 0.85);
    return sh;
  });
  const board = new THREE.Group(); board.position.set(0.03, -0.09, 0.07); board.rotation.set(-0.9, 0, 0); arms[1].add(board);
  part(board, new THREE.BoxGeometry(0.11, 0.14, 0.013), 0x9a7b55, 0, 0, 0);
  part(board, new THREE.BoxGeometry(0.085, 0.105, 0.004), 0xfdfbf5, 0, -0.004, 0.008);
  part(board, new THREE.BoxGeometry(0.045, 0.016, 0.012), 0x8a8f96, 0, 0.066, 0.009);
  /* 頭：臉、眼睛、腮紅、安全帽 */
  const head = new THREE.Group(); head.position.y = 0.6; body.add(head);
  part(head, new THREE.SphereGeometry(0.12, 22, 16), SKIN, 0, 0, 0);
  [-1, 1].forEach(sd => {
    part(head, new THREE.SphereGeometry(0.016, 10, 8), 0x22201d, sd * 0.042, 0.0, 0.108);
    part(head, new THREE.SphereGeometry(0.02, 10, 8), 0xf2a3a0, sd * 0.07, -0.038, 0.094).scale.set(1, 0.6, 0.4);
  });
  part(head, new THREE.SphereGeometry(0.132, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0xf2c14e, 0, 0.03, 0, { roughness: 0.45 }).scale.y = 0.85;
  part(head, new THREE.CylinderGeometry(0.16, 0.16, 0.018, 24), 0xf2c14e, 0, 0.03, 0.025, { roughness: 0.45 });
  part(head, new THREE.BoxGeometry(0.026, 0.03, 0.24), 0xe0ac38, 0, 0.135, 0, { roughness: 0.45 });
  /* 竹蜻蜓：起飛時才出現，裝在安全帽頂上 */
  const prop = new THREE.Group(); prop.position.y = 0.17; prop.visible = false; head.add(prop);
  part(prop, new THREE.CylinderGeometry(0.012, 0.012, 0.09, 8), 0x8a8f96, 0, 0.0, 0);
  const blades = new THREE.Group(); blades.position.y = 0.05; prop.add(blades);
  [0, Math.PI].forEach(a => { const b = part(blades, new THREE.BoxGeometry(0.2, 0.008, 0.045), 0xe4572e, Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1); b.rotation.y = -a; });
  part(blades, new THREE.SphereGeometry(0.02, 10, 8), 0xe4572e, 0, 0, 0);
  player.scale.setScalar(1.05); player.visible = false; island.add(player);

  /* 腳下的定位圈，以及點地面時的目的地標記 */
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xe4572e, transparent: true, opacity: 0.55, depthWrite: false });
  const shadowRing = new THREE.Mesh(new THREE.RingGeometry(0.17, 0.22, 32).rotateX(-Math.PI / 2), ringMat); shadowRing.renderOrder = 5; player.add(shadowRing); shadowRing.position.y = 0.02;
  const goalMark = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.2, 32).rotateX(-Math.PI / 2), ringMat.clone()); goalMark.visible = false; island.add(goalMark);

  /* ============================================================
     障礙物：每棟建物用「跟著它轉向的方框」，只算高出地面的部分（操場、田、池塘可以走過去）
     ============================================================ */
  let boxes = [];   /* { id, inv, fwd, x0,x1,z0,z1（實體部分，局部座標）, a0..a3（整體範圍，判斷靠近用）, top, solid } */
  const FLAT = new Set(['park', 'farm']);
  const _v = new THREE.Vector3(), _m = new THREE.Matrix4(), _b = new THREE.Box3(), _wp = new THREE.Vector3();
  function buildObstacles() {
    boxes = [];
    for (const id in spotObjs) for (const o of spotObjs[id]) {
      o.updateWorldMatrix(true, true); o.getWorldPosition(_wp);
      if (tOf(_wp.x, _wp.z) > 1.0) continue;   /* 外海小島上的東西不算 */
      const inv = o.matrixWorld.clone().invert();
      const solid = new THREE.Box3(), all = new THREE.Box3();
      o.traverse(c => {
        if (!c.isMesh || !c.geometry || !c.visible && c !== o) return;
        if (!c.geometry.boundingBox) c.geometry.computeBoundingBox();
        _m.multiplyMatrices(inv, c.matrixWorld); _b.copy(c.geometry.boundingBox).applyMatrix4(_m);
        if (!isFinite(_b.min.x)) return;
        /* 只算碰得到地面的部分：塔吊的吊臂、熱氣球這類在半空中的東西，底下照樣可以走 */
        if (_b.min.y > 0.6) return;
        all.union(_b);
        if (_b.max.y > 0.28 && _b.max.y - _b.min.y > 0.1) solid.union(_b);
      });
      if (all.isEmpty()) continue;
      boxes.push({
        id, inv, fwd: o.matrixWorld.clone(), top: _wp.y + (solid.isEmpty() ? all.max.y : solid.max.y),
        solid: !FLAT.has(id) && !solid.isEmpty(),
        x0: solid.min.x, x1: solid.max.x, z0: solid.min.z, z1: solid.max.z,
        a0: all.min.x, a1: all.max.x, a2: all.min.z, a3: all.max.z, y0: _wp.y,
      });
    }
  }
  /* 世界座標的點到方框的水平距離（先轉到建物自己的座標） */
  function local(b, x, z) { _v.set(x, b.y0 + 0.3, z).applyMatrix4(b.inv); return _v; }
  const dSolid = (b, x, z) => { const p = local(b, x, z); return Math.hypot(Math.max(b.x0 - p.x, 0, p.x - b.x1), Math.max(b.z0 - p.z, 0, p.z - b.z1)); };
  const dAll = (b, x, z) => { const p = local(b, x, z); return Math.hypot(Math.max(b.a0 - p.x, 0, p.x - b.a1), Math.max(b.a2 - p.z, 0, p.z - b.a3)); };
  function blocked(x, z) {
    if (tOf(x, z) > 0.96) return true;   /* 沙灘可以走，不走進海裡 */
    for (const b of boxes) if (b.solid && dSolid(b, x, z) < R) return true;
    for (const t of trees) if (Math.abs(t.x - x) < 0.3 && Math.abs(t.z - z) < 0.3 && Math.hypot(t.x - x, t.z - z) < 0.2) return true;
    return false;
  }
  /* 方框外圍一圈的點（世界座標），用來決定「走到建物旁邊」的目的地 */
  function ringAround(b, pad) {
    const out = [], cx = (b.a0 + b.a1) / 2, cz = (b.a2 + b.a3) / 2, hx = (b.a1 - b.a0) / 2 + pad, hz = (b.a3 - b.a2) / 2 + pad;
    for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2; _v.set(cx + Math.cos(a) * hx, 0.3, cz + Math.sin(a) * hz).applyMatrix4(b.fwd); out.push([_v.x, _v.z]); }
    return out;
  }

  /* ============================================================
     找路：把島切成 0.25 的格子，用 A* 繞過建物與樹，再把路線拉直
     ============================================================ */
  const G = 0.25, GX0 = -12.5, GN = 100;
  let grid = null;
  const cellOf = (x, z) => [Math.round((x - GX0) / G), Math.round((z - GX0) / G)];
  const posOf = (i, j) => [GX0 + i * G, GX0 + j * G];
  function buildGrid() {
    grid = new Uint8Array(GN * GN);
    for (let i = 0; i < GN; i++) for (let j = 0; j < GN; j++) { const [x, z] = posOf(i, j); grid[i * GN + j] = blocked(x, z) ? 1 : 0; }
  }
  function clear(ax, az, bx, bz) { const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.12); for (let k = 1; k <= n; k++) { const u = k / n; if (blocked(ax + (bx - ax) * u, az + (bz - az) * u)) return false; } return true; }
  function findPath(ax, az, bx, bz) {
    if (clear(ax, az, bx, bz)) return [[bx, bz]];
    const [si, sj] = cellOf(ax, az); let [ti, tj] = cellOf(bx, bz);
    const ok = (i, j) => i >= 0 && j >= 0 && i < GN && j < GN && !grid[i * GN + j];
    if (!ok(ti, tj)) { let best = null, bd = 1e9; for (let di = -6; di <= 6; di++) for (let dj = -6; dj <= 6; dj++) if (ok(ti + di, tj + dj) && di * di + dj * dj < bd) { bd = di * di + dj * dj; best = [ti + di, tj + dj]; } if (!best) return null; [ti, tj] = best; }
    const N = GN * GN, gs = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N), open = [];
    const h = (i, j) => Math.hypot(i - ti, j - tj), s0 = si * GN + sj; gs[s0] = 0; open.push([h(si, sj), s0]);
    let found = false, guard = 0;
    while (open.length && guard++ < 20000) {
      let m = 0; for (let k = 1; k < open.length; k++) if (open[k][0] < open[m][0]) m = k;
      const c = open[m][1]; open[m] = open[open.length - 1]; open.pop();
      if (closed[c]) continue; closed[c] = 1;
      const ci = Math.floor(c / GN), cj = c % GN; if (ci === ti && cj === tj) { found = true; break; }
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        if (!di && !dj) continue; const ni = ci + di, nj = cj + dj; if (!ok(ni, nj)) continue;
        if (di && dj && (!ok(ci + di, cj) || !ok(ci, cj + dj))) continue;
        const nc = ni * GN + nj, g2 = gs[c] + (di && dj ? 1.414 : 1); if (g2 < gs[nc]) { gs[nc] = g2; from[nc] = c; open.push([g2 + h(ni, nj), nc]); }
      }
    }
    if (!found) return null;
    const cells = []; for (let c = ti * GN + tj; c !== -1 && c !== s0; c = from[c]) cells.push(posOf(Math.floor(c / GN), c % GN));
    cells.reverse();
    const out = []; let cx = ax, cz = az, k = 0;
    while (k < cells.length) { let far = k; for (let m = cells.length - 1; m > k; m--) if (clear(cx, cz, cells[m][0], cells[m][1])) { far = m; break; } out.push(cells[far]); cx = cells[far][0]; cz = cells[far][1]; k = far + 1; }
    return out;
  }
  let path = [], goal = null;
  function setGoal(x, z) {
    const p = findPath(player.position.x, player.position.z, x, z);
    if (!p || !p.length) { goal = null; path = []; goalMark.visible = false; return false; }
    path = p; const last = p[p.length - 1]; goal = new THREE.Vector3(p[0][0], 0, p[0][1]);
    goalMark.position.set(last[0], groundY(last[0], last[1]) + 0.03, last[1]); goalMark.visible = true; return true;
  }
  function stopGoal() { goal = null; path = []; goalMark.visible = false; }
  /* 走到某棟建物旁邊 */
  function goTo(id) {
    if (state.fly) { if (!spotObjs[id]) return false; state.flyGoal = id; return true; }
    const px = player.position.x, pz = player.position.z;
    const list = boxes.filter(b => b.id === id); if (!list.length) return false;
    const b = list.reduce((a, c) => (dAll(c, px, pz) < dAll(a, px, pz) ? c : a));
    const cand = ringAround(b, 0.4).filter(([x, z]) => !blocked(x, z)).sort((u, v) => Math.hypot(u[0] - px, u[1] - pz) - Math.hypot(v[0] - px, v[1] - pz));
    for (const [x, z] of cand.slice(0, 8)) if (setGoal(x, z)) return true;
    return false;
  }
  /* 走到某位路人面前 */
  function goToNpc(id) {
    const n = npcObjs.find(o => o.id === id); if (!n) return false;
    const nx = n.g.position.x, nz = n.g.position.z;
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, x = nx + Math.cos(a) * 0.65, z = nz + Math.sin(a) * 0.65; if (!blocked(x, z) && setGoal(x, z)) return true; }
    return false;
  }

  /* ============================================================
     輸入：鍵盤、搖桿、拖曳轉視角、點地面走過去
     ============================================================ */
  const keys = new Set(); let stick = [0, 0];
  let yaw = 0.84, pitch = 0.8;
  const onKey = e => {
    if (e.target?.closest?.('input,textarea,select')) return;
    const k = e.key === ' ' ? 'space' : e.key.toLowerCase(); if (!['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'space', 'shift'].includes(k)) return;
    if ((k === 'space' || k === 'shift') && !state.fly) return;
    e.preventDefault(); if (e.type === 'keydown') { keys.add(k); stopGoal(); } else keys.delete(k);
  };
  const stickEl = document.createElement('div'); stickEl.className = 'walk-stick'; stickEl.innerHTML = '<i></i>';
  const knob = stickEl.firstChild; let stickId = null;
  const stickMove = e => {
    const r = stickEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, max = r.width / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy); if (d > max) { dx *= max / d; dy *= max / d; }
    stick = [dx / max, dy / max]; knob.style.transform = `translate(${dx}px,${dy}px)`;
  };
  stickEl.addEventListener('pointerdown', e => { stickId = e.pointerId; try { stickEl.setPointerCapture(e.pointerId); } catch {} stopGoal(); stickMove(e); e.stopPropagation(); });
  stickEl.addEventListener('pointermove', e => { if (e.pointerId === stickId) stickMove(e); });
  const stickEnd = e => { if (e.pointerId !== stickId) return; stickId = null; stick = [0, 0]; knob.style.transform = ''; };
  stickEl.addEventListener('pointerup', stickEnd); stickEl.addEventListener('pointercancel', stickEnd);

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let drag = null;
  const onDown = e => { if (e.target !== renderer.domElement) return; drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, id: e.pointerId }; };
  const onMove = e => {
    if (!drag || e.pointerId !== drag.id) return;
    yaw -= (e.clientX - drag.x) * 0.008; pitch = clamp(pitch + (e.clientY - drag.y) * 0.004, 0.25, 1.2);
    drag.x = e.clientX; drag.y = e.clientY;
  };
  const onUp = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const moved = Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0); drag = null; if (moved > 8) return;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
    const mine = o => { for (; o; o = o.parent) if (o === player || o === goalMark) return true; return false; };
    const hit = ray.intersectObjects(island.children, true).find(h => !mine(h.object));
    if (!hit) return;
    let o = hit.object, sid = null, npc = null;
    while (o) { if (o.userData.npc) { npc = o.userData.npc; break; } if (o.userData.spot) { sid = o.userData.spot; break; } o = o.parent; }
    if (npc) goToNpc(npc); else if (sid) goTo(sid); else setGoal(hit.point.x, hit.point.z);
  };

  /* ============================================================
     路人：可以對話的人頭上有對話泡泡（名字＋一句話）；一般路人偶爾也會說一句
     ============================================================ */
  const bubble = (cls) => { const el = document.createElement('div'); el.className = cls; const o = new CSS2DObject(el); o.visible = false; return [el, o]; };
  const npcObjs = npcs.map((n, i) => {
    const g = people[i]; if (!g) return null;
    g.userData.npc = n.id;
    const [el, tag] = bubble('npc-bubble'); tag.position.set(0, 1.05, 0); g.add(tag);
    el.innerHTML = '<b></b><span></span>'; el.firstChild.textContent = n.who;
    el.addEventListener('click', () => goToNpc(n.id));
    return { ...n, g, tag, el, line: el.lastChild, shown: '' };
  }).filter(Boolean);
  const passers = people.slice(npcObjs.length).map(g => { const [el, tag] = bubble('say-bubble'); tag.position.set(0, 0.95, 0); g.add(tag); return { g, el, tag, t: 2 + Math.random() * 8, on: 0 }; });
  const short = s => (s.length > 22 ? s.slice(0, 21) + '…' : s);
  /* 泡泡在畫面上的位置：太靠上（上方按鈕列）或太靠下（搖桿、互動鈕）就先藏起來 */
  const _sp = new THREE.Vector3();
  function bubbleOk(g, h) {
    _sp.copy(g.position); _sp.y += h; g.parent.localToWorld(_sp); _sp.project(camera);
    const H = renderer.domElement.clientHeight || 600, y = (1 - _sp.y) / 2 * H;
    return _sp.z < 1 && y > 150 && y < H - 110;
  }

  /* ============================================================
     進入、離開、每一格
     ============================================================ */
  const state = { active: false, t: 0, from: new THREE.Vector3(), fromT: new THREE.Vector3(), near: null, talking: null, fly: false, landing: false, vIn: 0, flyGoal: null, scanT: 0 };
  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(); let camDist = 4.8, camPitch = 0.8;
  function treeHidden(x, z) {
    if (!state.active) return false;
    const ax = camera.position.x, az = camera.position.z, bx = player.position.x, bz = player.position.z;
    const vx = bx - ax, vz = bz - az, L2 = vx * vx + vz * vz || 1, u = clamp(((x - ax) * vx + (z - az) * vz) / L2, 0, 1);
    return Math.hypot(ax + vx * u - x, az + vz * u - z) < (u > 0.85 ? 0.75 : 0.9);
  }
  function spawnPoint() {
    for (let k = 0; k < 60; k++) {
      const a = 0.84 + (k % 2 ? 1 : -1) * Math.floor(k / 2) * 0.08, [x, z] = P(0.79, a);
      if (!blocked(x, z) && !trees.some(t => Math.hypot(t.x - x, t.z - z) < 1.0)) return [x, z, a];
    }
    const [x, z] = P(0.79, 0.84); return [x, z, 0.84];
  }
  function emitNear(n) {
    const key = n ? n.kind + ':' + n.id : '';
    if (key === (state.near ? state.near.kind + ':' + state.near.id : '')) return;
    state.near = n; document.dispatchEvent(new CustomEvent('island:near', { detail: n || { kind: null } }));
  }
  function stationNpcs() {
    for (const n of npcObjs) {
      const b = boxes.find(x => x.id === n.at); n.g.userData.wait = 1e9; if (!b) continue;
      const c = new THREE.Vector3((b.a0 + b.a1) / 2, 0.3, (b.a2 + b.a3) / 2).applyMatrix4(b.fwd);
      const spot = ringAround(b, 0.55).find(([x, z]) => !blocked(x, z) && !blocked(x + 0.3, z) && !blocked(x, z + 0.3));
      if (spot) { n.g.position.set(spot[0], groundY(spot[0], spot[1]), spot[1]); n.g.rotation.y = Math.atan2(spot[0] - c.x, spot[1] - c.z); }
    }
  }
  function enter() {
    if (state.active) return;
    buildObstacles(); buildGrid(); stationNpcs();
    const [x, z, a] = spawnPoint();
    player.position.set(x, groundY(x, z), z); player.rotation.y = a + Math.PI; player.visible = true;
    yaw = Math.atan2(x, z); pitch = 0.8; camPitch = 0.8; camDist = 4.8;
    state.fov = camera.fov; camera.fov = 52; camera.updateProjectionMatrix(); stopGoal(); keys.clear(); stick = [0, 0];
    state.active = true; state.t = 0; state.from.copy(camera.position); state.fromT.copy(controls.target);
    controls.enabled = false; controls.autoRotate = false;
    state.lim = [controls.minDistance, controls.maxPolarAngle]; controls.minDistance = 0.5; controls.maxPolarAngle = Math.PI * 0.49;
    renderer.domElement.style.touchAction = 'none';
    hero.classList.add('walking'); hero.appendChild(stickEl);
    npcObjs.forEach(n => n.tag.visible = true);
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
    renderer.domElement.addEventListener('pointerdown', onDown); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
    document.dispatchEvent(new CustomEvent('island:walk', { detail: { on: true } }));
  }
  function exit() {
    if (!state.active) return;
    state.active = false; player.visible = false; stopGoal(); keys.clear(); state.talking = null; setFly(false); prop.visible = false;
    if (state.lim) [controls.minDistance, controls.maxPolarAngle] = state.lim;
    if (state.fov) { camera.fov = state.fov; camera.updateProjectionMatrix(); }
    renderer.domElement.style.touchAction = 'pan-y';
    hero.classList.remove('walking'); stickEl.remove();
    npcObjs.forEach(n => { n.tag.visible = false; n.g.userData.wait = 0; });
    passers.forEach(p => { p.tag.visible = false; });
    window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey);
    renderer.domElement.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
    emitNear(null);
    document.dispatchEvent(new CustomEvent('island:walk', { detail: { on: false } }));
    ctx.onExit();
  }
  /* ---------- 飛行：起飛、上升下降、降落 ---------- */
  function setFly(on) {
    if (state.fly === on && !state.landing) return;
    state.fly = on; state.landing = false; state.flyGoal = null; state.vIn = 0;
    prop.visible = on; if (!on) { keys.delete('space'); keys.delete('shift'); }
    document.dispatchEvent(new CustomEvent('island:fly', { detail: { on } }));
  }
  /* 起飛：往上升到離地 2.5；降落：下面是陸地才可以，慢慢落到地面 */
  function fly(on) {
    if (!state.active) return false;
    if (on) { if (state.fly) return true; stopGoal(); setFly(true); state.alt = player.position.y + 2.5; return true; }
    if (!state.fly) return true;
    const x = player.position.x, z = player.position.z;
    if (tOf(x, z) > 0.96 || blocked(x, z)) return false;
    state.landing = true; state.flyGoal = null; return true;
  }
  /* 手機上的上升／下降鈕：1 上、-1 下、0 停 */
  function lift(v) { state.vIn = v; if (v) state.flyGoal = null; }
  /* 飛行中判斷靠近哪個勘查點：每 0.15 秒重算一次所有物件的範圍（船會移動） */
  const _bb = new THREE.Box3(), _pp = new THREE.Vector3();
  function flyNear() {
    _pp.copy(player.position).add(new THREE.Vector3(0, 0.4, 0));
    let near = null, best = 1.3;
    for (const id in spotObjs) for (const o of spotObjs[id]) { _bb.setFromObject(o); if (_bb.isEmpty()) continue; const d = _bb.distanceToPoint(_pp); if (d < best) { best = d; near = { kind: 'spot', id }; } }
    return near;
  }
  function flyUpdate(dt, T) {
    const p = player.position;
    /* 下面的高度：陸地、建物屋頂或海面，至少高出 0.35 */
    const floorAt = (x, z) => { let f = tOf(x, z) > 1.0 ? 0.2 : groundY(x, z); for (const b of boxes) if (b.solid && dSolid(b, x, z) < 0.15) f = Math.max(f, b.top); return f + 0.35; };
    if (state.landing) {
      p.y -= 1.8 * dt; const g = groundY(p.x, p.z);
      if (p.y <= g) { p.y = g; setFly(false); }
    } else {
      /* 水平：鍵盤、搖桿，或飛向目標（目標是會動的船就一直追著它） */
      mv.set(0, 0, 0);
      if (keys.has('w') || keys.has('arrowup')) mv.add(fwd);
      if (keys.has('s') || keys.has('arrowdown')) mv.sub(fwd);
      if (keys.has('d') || keys.has('arrowright')) mv.add(right);
      if (keys.has('a') || keys.has('arrowleft')) mv.sub(right);
      if (stick[0] || stick[1]) mv.addScaledVector(right, stick[0]).addScaledVector(fwd, -stick[1]);
      let vy = (keys.has('space') ? 1 : 0) - (keys.has('shift') ? 1 : 0) + state.vIn;
      if (mv.lengthSq() || vy) state.flyGoal = null;
      if (state.flyGoal) {
        const o = spotObjs[state.flyGoal][0]; _bb.setFromObject(o); const c = _bb.getCenter(new THREE.Vector3()), sz = _bb.getSize(new THREE.Vector3());
        const tx = c.x, tz = c.z, ty = Math.max(_bb.max.y + 0.4, floorAt(tx, tz));
        mv.set(tx - p.x, 0, tz - p.z); const hd = mv.length(), reach = Math.max(sz.x, sz.z) / 2 + 0.8;
        if (hd < reach) mv.set(0, 0, 0); else mv.normalize();
        vy = clamp((ty - p.y) * 1.5, -1, 1);
        if (hd < reach && Math.abs(ty - p.y) < 0.3) state.flyGoal = null;
      }
      const len = Math.min(1, mv.length());
      if (len > 0.05) {
        mv.normalize().multiplyScalar((state.flyGoal ? 8 : 5.5) * len * dt);
        const nx = p.x + mv.x, nz = p.z + mv.z; if (Math.hypot(nx, nz) < 38) { p.x = nx; p.z = nz; }
        const want = Math.atan2(mv.x, mv.z); let d = want - player.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); player.rotation.y += d * Math.min(1, dt * 8);
      }
      state.alt = clamp((state.alt ?? p.y) + vy * 2.6 * dt, floorAt(p.x, p.z), 16);
      p.y += (state.alt - p.y) * Math.min(1, dt * 6);
      /* 姿勢：往前傾、腳垂著、手微張，飄飄的 */
      body.rotation.x += ((len > 0.05 ? 0.35 : 0) - body.rotation.x) * Math.min(1, dt * 6);
    }
    blades.rotation.y += dt * 28;
    const k = Math.min(1, dt * 8);
    legs.forEach((l, i) => l.rotation.x += ((i ? -0.15 : 0.2) + Math.sin(T * 3 + i) * 0.08 - l.rotation.x) * k);
    arms.forEach((a, i) => { a.rotation.x += (-0.2 - a.rotation.x) * k; a.rotation.z += ((i ? -1 : 1) * (0.7 + Math.sin(T * 9) * 0.15) - a.rotation.z) * k; });
    body.scale.set(1, 1, 1);
    body.position.y = Math.sin(T * 3) * 0.02;
    /* 腳下的圈圈投在地面上，看得出現在飛多高 */
    shadowRing.position.y = (groundY(p.x, p.z) > -0.5 && tOf(p.x, p.z) < 1.0 ? groundY(p.x, p.z) : 0.15) - p.y + 0.03;
    state.scanT -= dt; if (state.scanT <= 0) { state.scanT = 0.15; emitNear(state.landing ? null : flyNear()); }
  }

  /* 頁面告訴我們正在跟誰說話（泡泡顯示「…說話中」） */
  function talking(id) { state.talking = id; }

  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), mv = new THREE.Vector3();
  let stepT = 0;
  function update(dt, T) {
    if (!state.active) return;
    fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)); right.set(-fwd.z, 0, fwd.x);
    mv.set(0, 0, 0);
    if (keys.has('w') || keys.has('arrowup')) mv.add(fwd);
    if (keys.has('s') || keys.has('arrowdown')) mv.sub(fwd);
    if (keys.has('d') || keys.has('arrowright')) mv.add(right);
    if (keys.has('a') || keys.has('arrowleft')) mv.sub(right);
    if (stick[0] || stick[1]) mv.addScaledVector(right, stick[0]).addScaledVector(fwd, -stick[1]);
    if (state.fly) { flyUpdate(dt, T); followCam(dt, true); return; }
    body.rotation.x = 0; shadowRing.position.y = 0.02;
    if (goal && mv.lengthSq() === 0) {
      mv.set(goal.x - player.position.x, 0, goal.z - player.position.z);
      if (mv.length() < 0.12) { path.shift(); if (path.length) goal.set(path[0][0], 0, path[0][1]); else stopGoal(); mv.set(0, 0, 0); }
    }
    const len = Math.min(1, mv.length()); let moving = false;
    if (len > 0.05 && state.t >= 1) {
      mv.normalize().multiplyScalar(SPEED * len * dt);
      const p = player.position, nx = p.x + mv.x, nz = p.z + mv.z;
      if (!blocked(nx, nz)) { p.x = nx; p.z = nz; moving = true; }
      else if (!blocked(nx, p.z)) { p.x = nx; moving = true; }
      else if (!blocked(p.x, nz)) { p.z = nz; moving = true; }
      else if (goal) stopGoal();
      p.y = groundY(p.x, p.z);
      const want = Math.atan2(mv.x, mv.z); let d = want - player.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); player.rotation.y += d * Math.min(1, dt * 12);
    }
    /* 走路動畫：沒有腳，整個人一跳一跳；落地時壓扁一點、小手跟著拍；停下來輕輕呼吸 */
    stepT += moving ? dt * 12 : 0;
    const hop = moving ? Math.abs(Math.sin(stepT)) : 0, k = Math.min(1, dt * 18);
    body.position.y += ((moving ? hop * 0.1 : Math.sin(T * 2) * 0.004) - body.position.y) * k;
    const sq = moving && hop < 0.3 ? 1 + (0.3 - hop) * 0.45 : 1;
    body.scale.set(sq, 1 / sq, sq);
    arms.forEach((a, i) => { a.rotation.z += ((i ? -1 : 1) * (moving ? 0.15 + hop * 0.55 : 0.08) - a.rotation.z) * k; a.rotation.x += ((i ? -0.25 : 0) - a.rotation.x) * k; });
    head.rotation.z = moving ? Math.sin(stepT * 0.5) * 0.06 : 0;
    goalMark.rotation.y += dt; goalMark.material.opacity = 0.4 + Math.sin(T * 6) * 0.2;

    /* 身邊有誰：路人優先，其次是建物 */
    const px = player.position.x, pz = player.position.z;
    let near = null, best = 9, nearN = null;
    for (const n of npcObjs) {
      const d = Math.hypot(n.g.position.x - px, n.g.position.z - pz);
      if (d < NEAR_NPC && d < best) { best = d; nearN = n; near = { kind: 'npc', id: n.id, label: n.who }; }
      /* 泡泡內容：說話中／靠近時說一句招呼／遠遠的只顯示名字 */
      const txt = state.talking === n.id ? '（說話中…）' : d < 4.5 ? short(n.hello) : '';
      if (txt !== n.shown) { n.shown = txt; n.line.textContent = txt; n.el.classList.toggle('open', !!txt); }
      n.el.style.visibility = bubbleOk(n.g, 1.05) ? '' : 'hidden';
    }
    if (nearN) nearN.g.rotation.y = Math.atan2(px - nearN.g.position.x, pz - nearN.g.position.z);
    if (!near) { best = 9; for (const b of boxes) { const d = dAll(b, px, pz); if (d < NEAR_SPOT && d < best) { best = d; near = { kind: 'spot', id: b.id }; } } }
    emitNear(near);
    /* 一般路人：離你不遠時，偶爾說一句話，3 秒後收起來 */
    if (ambient.length) for (const s of passers) {
      if (s.on > 0) { s.on -= dt; if (s.on <= 0) s.tag.visible = false; else s.el.style.visibility = bubbleOk(s.g, 0.95) ? '' : 'hidden'; continue; }
      s.t -= dt; if (s.t > 0) continue; s.t = 6 + Math.random() * 9;
      if (Math.hypot(s.g.position.x - px, s.g.position.z - pz) > 6) continue;
      s.el.textContent = ambient[Math.floor(Math.random() * ambient.length)]; s.tag.visible = true; s.on = 3.2;
    }

    followCam(dt, false);
  }

  /* 鏡頭：跟在小人後上方；走路時被建物擋住先抬高，抬到快正上方還擋才拉近；飛行時拉遠一點 */
  function followCam(dt, flying) {
    const px = player.position.x, pz = player.position.z;
    const tg = camTgt.set(px, player.position.y + 0.6, pz);
    const hitAt = (d, p) => { const x = px + Math.sin(yaw) * d * Math.cos(p), y = tg.y + Math.sin(p) * d, z = pz + Math.cos(yaw) * d * Math.cos(p); return boxes.some(b => b.solid && y < b.top + 0.2 && dSolid(b, x, z) < 0.2); };
    const lineHit = (D, p) => { for (let d = 0.6; d <= D; d += 0.25) if (hitAt(d, p)) return d; return 0; };
    let wantP = flying ? Math.max(pitch, 0.35) : pitch, wantD = flying ? 6.5 : 4.8;
    if (!flying && lineHit(4.8, pitch)) { wantP = 1.35; for (let p = pitch + 0.1; p <= 1.35; p += 0.08) if (!lineHit(4.8, p)) { wantP = p; break; } const h = lineHit(4.8, wantP); if (h) wantD = Math.max(1.6, h - 0.3); }
    camDist += (wantD - camDist) * Math.min(1, dt * (wantD < camDist ? 10 : 3));
    camPitch += (wantP - camPitch) * Math.min(1, dt * 5);
    camPos.set(px + Math.sin(yaw) * camDist * Math.cos(camPitch), tg.y + Math.sin(camPitch) * camDist, pz + Math.cos(yaw) * camDist * Math.cos(camPitch));
    if (state.t < 1) {
      state.t = Math.min(1, state.t + dt / 1.6); const e = state.t < .5 ? 4 * state.t ** 3 : 1 - Math.pow(-2 * state.t + 2, 3) / 2;
      camera.position.lerpVectors(state.from, camPos, e); controls.target.lerpVectors(state.fromT, tg, e);
    } else {
      camera.position.lerp(camPos, 1 - Math.exp(-dt * 8)); controls.target.lerp(tg, 1 - Math.exp(-dt * 10));
    }
  }

  function dispose() {
    if (state.active) { state.active = false; hero.classList.remove('walking'); stickEl.remove(); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); }
  }

  /* 檢查用：陸地有幾成可以走、每個勘查點從起點走不走得到 */
  function check() {
    let land = 0, free = 0;
    for (let i = 0; i < GN; i++) for (let j = 0; j < GN; j++) { const [x, z] = posOf(i, j); if (tOf(x, z) < 0.96) { land++; if (!grid[i * GN + j]) free++; } }
    const [sx, sz] = spawnPoint(), res = {};
    for (const b of boxes) { if (res[b.id]) continue; const pts = ringAround(b, 0.4).filter(([x, z]) => !blocked(x, z)); res[b.id] = pts.some(([x, z]) => findPath(sx, sz, x, z)) ? 'ok' : pts.length ? 'noPath' : 'noRoom'; }
    const npcAt = Object.fromEntries(npcObjs.map(n => { const x = n.g.position.x, z = n.g.position.z, b = boxes.find(q => q.id === n.at); return [n.id, (blocked(x, z) ? 'INSIDE ' : 'outside ') + (b ? dSolid(b, x, z).toFixed(2) : '?')]; }));
    return { walkable: Math.round(free / land * 100) + '%', spots: res, npcAt };
  }

  return { enter, exit, update, goTo, goToNpc, talking, fly, lift, dispose, treeHidden, check, get active() { return state.active; } };
}
