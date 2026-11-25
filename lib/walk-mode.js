/* ============================================================
   價值島 — 走進島上（遊戲導覽模式，原型）
   按下「走進島上」才由 island-scene.js 動態載入，平常不下載。
   一個戴安全帽的估價師小人：鍵盤（WASD／方向鍵）、手機搖桿或點地面走路；
   走近有身分的路人可以對話，走近建物可以「進去看看」（打開勘查卷宗、蓋章）。
   透過 document 事件通知頁面：
     island:walk  { on }                               進入／離開
     island:near  { kind: 'npc'|'spot'|null, id, label } 身邊有沒有可以互動的對象
   ============================================================ */
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

/**
 * ctx：island-scene.js 傳進來的場景與工具
 *   scene, island, camera, controls, renderer, hero, groundY(x,z), tOf(x,z),
 *   spotObjs { id: Object3D[] }, people Group[], trees [{x,z}], npcs [{ id, who, color }],
 *   onExit()：離開後要做的事（鏡頭回全景、恢復轉動）
 */
export function createWalk(ctx) {
  const { scene, island, camera, controls, renderer, hero, groundY, tOf, P, spotObjs, people, trees, npcs } = ctx;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const SPEED = 2.1, R = 0.2, NEAR_SPOT = 0.75, NEAR_NPC = 1.25;

  /* ---------- 小人：黏土風的估價師（藍襯衫、黃色安全帽、手上拿勘查板） ---------- */
  const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 });
  const player = new THREE.Group();
  const body = new THREE.Group(); player.add(body);
  const add = (geo, c, x, y, z) => { const m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, z); m.castShadow = true; body.add(m); return m; };
  add(new THREE.CapsuleGeometry(0.14, 0.26, 4, 12), 0x2a6f97, 0, 0.3, 0);
  add(new THREE.SphereGeometry(0.13, 16, 12), 0xf5d2b8, 0, 0.64, 0);
  const hat = add(new THREE.SphereGeometry(0.14, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0xf2c14e, 0, 0.68, 0);
  add(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 16), 0xf2c14e, 0, 0.68, 0.02);
  add(new THREE.BoxGeometry(0.16, 0.2, 0.025), 0x9a7b55, 0.1, 0.33, 0.15).rotation.x = -0.4;
  add(new THREE.BoxGeometry(0.12, 0.14, 0.03), 0xfaf6ea, 0.1, 0.34, 0.165).rotation.x = -0.4;
  hat.scale.y = 0.9; player.scale.setScalar(1.15); player.visible = false; island.add(player);

  /* 小人腳下的定位圈，以及點地面時的目的地標記 */
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xe4572e, transparent: true, opacity: 0.6, depthWrite: false });
  const shadowRing = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.26, 32).rotateX(-Math.PI / 2), ringMat); shadowRing.renderOrder = 5; player.add(shadowRing); shadowRing.position.y = 0.02;
  const goalMark = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.2, 32).rotateX(-Math.PI / 2), ringMat.clone()); goalMark.visible = false; island.add(goalMark);

  /* ---------- 障礙物：建物外框（XZ 平面的方框）＋樹幹 ---------- */
  let boxes = [];   /* { id, x0, x1, z0, z1 } */
  const FLAT = new Set(['park', 'farm']);    /* 可以走進去的平面場地 */
  function buildObstacles() {
    boxes = []; const b = new THREE.Box3();
    for (const id in spotObjs) for (const o of spotObjs[id]) {
      b.setFromObject(o); if (!isFinite(b.min.x)) continue;
      const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
      if (tOf(cx, cz) > 1.05) continue;   /* 外海小島上的東西不算 */
      boxes.push({ id, x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z, top: b.max.y, solid: !FLAT.has(id) && b.max.y - b.min.y > 0.35 });
    }
  }
  const boxDist = (bx, x, z) => Math.hypot(Math.max(bx.x0 - x, 0, x - bx.x1), Math.max(bx.z0 - z, 0, z - bx.z1));
  function blocked(x, z) {
    if (tOf(x, z) > 0.93) return true;   /* 不走進海裡 */
    for (const bx of boxes) if (bx.solid && boxDist(bx, x, z) < R) return true;
    for (const t of trees) if (Math.hypot(t.x - x, t.z - z) < 0.2 + R * 0.6) return true;
    return false;
  }

  /* ---------- 找路：把島切成 0.25 的格子，用 A* 繞過建物與樹 ---------- */
  const G = 0.25, GX0 = -12.5, GN = 100;
  let grid = null;
  const cellOf = (x, z) => [Math.round((x - GX0) / G), Math.round((z - GX0) / G)];
  const posOf = (i, j) => [GX0 + i * G, GX0 + j * G];
  function buildGrid() {
    grid = new Uint8Array(GN * GN);
    for (let i = 0; i < GN; i++) for (let j = 0; j < GN; j++) { const [x, z] = posOf(i, j); grid[i * GN + j] = blocked(x, z) ? 1 : 0; }
  }
  /* 兩點之間直線能不能走（每 0.12 檢查一次） */
  function clear(ax, az, bx, bz) { const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.12); for (let k = 1; k <= n; k++) { const u = k / n; if (blocked(ax + (bx - ax) * u, az + (bz - az) * u)) return false; } return true; }
  function findPath(ax, az, bx, bz) {
    if (clear(ax, az, bx, bz)) return [[bx, bz]];
    let [si, sj] = cellOf(ax, az), [ti, tj] = cellOf(bx, bz);
    const ok = (i, j) => i >= 0 && j >= 0 && i < GN && j < GN && !grid[i * GN + j];
    /* 目的地剛好在障礙裡：找最近的空格 */
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
    /* 拉直：能直線走到的點就跳過中間的格子 */
    const out = []; let cx = ax, cz = az, k = 0;
    while (k < cells.length) { let far = k; for (let m = cells.length - 1; m > k; m--) if (clear(cx, cz, cells[m][0], cells[m][1])) { far = m; break; } out.push(cells[far]); cx = cells[far][0]; cz = cells[far][1]; k = far + 1; }
    return out;
  }
  let path = [];
  function setGoal(x, z) {
    const p = findPath(player.position.x, player.position.z, x, z);
    if (!p || !p.length) { goal = null; path = []; goalMark.visible = false; return false; }
    path = p; const last = p[p.length - 1]; goal = new THREE.Vector3(p[0][0], 0, p[0][1]);
    goalMark.position.set(last[0], groundY(last[0], last[1]) + 0.03, last[1]); goalMark.visible = true; return true;
  }

  /* ---------- 輸入：鍵盤、搖桿、拖曳轉視角、點地面走過去 ---------- */
  const keys = new Set(); let stick = [0, 0], goal = null, goalSpot = null;
  let yaw = 0.84, pitch = 0.5;   /* 鏡頭在小人後上方的方位角與仰角 */
  const onKey = e => {
    if (e.target?.closest?.('input,textarea,select')) return;
    const k = e.key.toLowerCase(); if (!['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) return;
    e.preventDefault(); if (e.type === 'keydown') { keys.add(k); goal = null; path = []; goalMark.visible = false; } else keys.delete(k);
  };
  /* 搖桿（觸控裝置才顯示） */
  const stickEl = document.createElement('div'); stickEl.className = 'walk-stick'; stickEl.innerHTML = '<i></i>';
  const knob = stickEl.firstChild; let stickId = null;
  const stickMove = e => {
    const r = stickEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, max = r.width / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy); if (d > max) { dx *= max / d; dy *= max / d; }
    stick = [dx / max, dy / max]; knob.style.transform = `translate(${dx}px,${dy}px)`;
  };
  stickEl.addEventListener('pointerdown', e => { stickId = e.pointerId; try { stickEl.setPointerCapture(e.pointerId); } catch {} goal = null; goalMark.visible = false; stickMove(e); e.stopPropagation(); });
  stickEl.addEventListener('pointermove', e => { if (e.pointerId === stickId) stickMove(e); });
  const stickEnd = e => { if (e.pointerId !== stickId) return; stickId = null; stick = [0, 0]; knob.style.transform = ''; };
  stickEl.addEventListener('pointerup', stickEnd); stickEl.addEventListener('pointercancel', stickEnd);

  /* 在畫面上拖曳：左右轉視角、上下調仰角；沒拖動就是點地面 */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let drag = null;
  const onDown = e => { if (e.target !== renderer.domElement) return; drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, id: e.pointerId }; };
  const onMove = e => {
    if (!drag || e.pointerId !== drag.id) return;
    yaw -= (e.clientX - drag.x) * 0.008; pitch = clamp(pitch + (e.clientY - drag.y) * 0.004, 0.18, 1.15);
    drag.x = e.clientX; drag.y = e.clientY;
  };
  const onUp = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const moved = Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0); drag = null; if (moved > 8) return;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(island.children, true).find(h => h.object !== shadowRing && h.object !== goalMark);
    if (!hit) return;
    /* 點到建物或路人：走到它旁邊；點到地面：走到那一點 */
    let o = hit.object, sid = null, npc = null;
    while (o) { if (o.userData.spot) { sid = o.userData.spot; break; } if (o.userData.npc) { npc = o; break; } o = o.parent; }
    if (npc) { const dx = player.position.x - npc.position.x, dz = player.position.z - npc.position.z, d = Math.hypot(dx, dz) || 1; setGoal(npc.position.x + dx / d * 0.6, npc.position.z + dz / d * 0.6); goalSpot = null; }
    else if (sid) goTo(sid, hit.point);
    else { setGoal(hit.point.x, hit.point.z); goalSpot = null; }
  };
  /* 走到某個勘查點旁邊（從卷宗的「走去下一處」或點建物進來） */
  function goTo(id, pt) {
    const list = boxes.filter(b => b.id === id); if (!list.length) return false;
    const px = player.position.x, pz = player.position.z;
    const b = list.reduce((a, c) => (boxDist(c, px, pz) < boxDist(a, px, pz) ? c : a));
    const tx = pt ? pt.x : (b.x0 + b.x1) / 2, tz = pt ? pt.z : (b.z0 + b.z1) / 2;
    goalSpot = id;
    if (!b.solid) return setGoal(tx, tz);
    /* 目的地：方框外面一圈上，離小人最近、而且走得到的一點 */
    const cand = [];
    for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, ex = (b.x0 + b.x1) / 2 + Math.cos(a) * ((b.x1 - b.x0) / 2 + 0.5), ez = (b.z0 + b.z1) / 2 + Math.sin(a) * ((b.z1 - b.z0) / 2 + 0.5); if (!blocked(ex, ez)) cand.push([Math.hypot(ex - px, ez - pz), ex, ez]); }
    cand.sort((u, v) => u[0] - v[0]);
    for (const c of cand.slice(0, 6)) if (setGoal(c[1], c[2])) return true;
    return false;
  }

  /* ---------- 可以對話的路人：頭上掛身分牌 ---------- */
  const npcObjs = npcs.map((n, i) => {
    const g = people[i]; if (!g) return null;
    g.userData.npc = n.id;
    const el = document.createElement('div'); el.className = 'npc-tag'; el.textContent = n.who;
    const tag = new CSS2DObject(el); tag.position.set(0, 1.0, 0); tag.visible = false; g.add(tag);
    return { ...n, g, tag };
  }).filter(Boolean);

  /* ---------- 進入、離開、每一格 ---------- */
  const state = { active: false, t: 0, from: new THREE.Vector3(), fromT: new THREE.Vector3(), near: null };
  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(); let camDist = 4.8, camPitch = 0.8;
  /* 擋在鏡頭與小人之間、或離鏡頭太近的樹：讓開（island-scene 畫樹時會問） */
  function treeHidden(x, z) {
    if (!state.active) return false;
    const ax = camera.position.x, az = camera.position.z, bx = player.position.x, bz = player.position.z;
    const vx = bx - ax, vz = bz - az, L2 = vx * vx + vz * vz || 1, u = clamp(((x - ax) * vx + (z - az) * vz) / L2, 0, 1);
    return Math.hypot(ax + vx * u - x, az + vz * u - z) < (u > 0.85 ? 0.55 : 0.85);
  }
  /* 起點：環島步道上、面對島中央（從全景鏡頭那一側走進來） */
  function spawnPoint() {
    for (let k = 0; k < 60; k++) {
      const a = 0.84 + (k % 2 ? 1 : -1) * Math.floor(k / 2) * 0.08, [x, z] = P(0.79, a);
      if (!blocked(x, z) && !trees.some(t => Math.hypot(t.x - x, t.z - z) < 1.2)) return [x, z, a];
    }
    const [x, z] = P(0.79, 0.84); return [x, z, 0.84];
  }
  function emitNear(n) {
    const key = n ? n.kind + ':' + n.id : '';
    if (key === (state.near ? state.near.kind + ':' + state.near.id : '')) return;
    state.near = n; document.dispatchEvent(new CustomEvent('island:near', { detail: n || { kind: null } }));
  }
  /* 走進島上時，可以對話的路人各自站到自己的地點旁邊等你 */
  function stationNpcs() {
    for (const n of npcObjs) {
      const list = boxes.filter(b => b.id === n.at); if (!list.length) continue;
      const b = list[0], cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
      for (let k = 0; k < 32; k++) {
        const a = k / 32 * Math.PI * 2 + 0.6, x = cx + Math.cos(a) * ((b.x1 - b.x0) / 2 + 0.55), z = cz + Math.sin(a) * ((b.z1 - b.z0) / 2 + 0.55);
        if (!blocked(x, z)) { n.g.position.set(x, groundY(x, z), z); n.g.rotation.y = Math.atan2(x - cx, z - cz); break; }
      }
      n.g.userData.wait = 1e9;
    }
  }
  function enter() {
    if (state.active) return;
    buildObstacles(); buildGrid(); stationNpcs();
    const [x, z, a] = spawnPoint();
    player.position.set(x, groundY(x, z), z); player.rotation.y = a + Math.PI; player.visible = true;
    yaw = Math.atan2(x, z); pitch = 0.8; camPitch = 0.8; camDist = 4.8;
    state.fov = camera.fov; camera.fov = 52; camera.updateProjectionMatrix(); goal = null; goalMark.visible = false; keys.clear(); stick = [0, 0];
    state.active = true; state.t = 0; state.from.copy(camera.position); state.fromT.copy(controls.target);
    controls.enabled = false; controls.autoRotate = false;
    /* 全景模式限制鏡頭至少離 9 單位、不能太平視；走路時要貼近小人，先放寬，離開時還原 */
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
    state.active = false; player.visible = false; goalMark.visible = false; keys.clear();
    if (state.lim) [controls.minDistance, controls.maxPolarAngle] = state.lim;
    if (state.fov) { camera.fov = state.fov; camera.updateProjectionMatrix(); }
    renderer.domElement.style.touchAction = 'pan-y';
    hero.classList.remove('walking'); stickEl.remove();
    npcObjs.forEach(n => { n.tag.visible = false; n.g.userData.wait = 0; });
    window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey);
    renderer.domElement.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
    emitNear(null);
    document.dispatchEvent(new CustomEvent('island:walk', { detail: { on: false } }));
    ctx.onExit();
  }

  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), mv = new THREE.Vector3();
  function update(dt, T) {
    if (!state.active) return;
    /* 移動方向：鍵盤＋搖桿（相對鏡頭方向），或走向點選的目的地 */
    fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)); right.set(-fwd.z, 0, fwd.x);
    mv.set(0, 0, 0);
    if (keys.has('w') || keys.has('arrowup')) mv.add(fwd);
    if (keys.has('s') || keys.has('arrowdown')) mv.sub(fwd);
    if (keys.has('d') || keys.has('arrowright')) mv.add(right);
    if (keys.has('a') || keys.has('arrowleft')) mv.sub(right);
    if (stick[0] || stick[1]) mv.addScaledVector(right, stick[0]).addScaledVector(fwd, -stick[1]);
    if (goal && mv.lengthSq() === 0) {
      mv.set(goal.x - player.position.x, 0, goal.z - player.position.z);
      if (mv.length() < 0.12) {
        path.shift();
        if (path.length) goal.set(path[0][0], 0, path[0][1]); else { goal = null; goalMark.visible = false; }
        mv.set(0, 0, 0);
      }
    }
    const len = Math.min(1, mv.length()); let moving = false;
    if (len > 0.05 && state.t >= 1) {
      mv.normalize().multiplyScalar(SPEED * len * dt);
      const p = player.position, nx = p.x + mv.x, nz = p.z + mv.z;
      if (!blocked(nx, nz)) { p.x = nx; p.z = nz; moving = true; }
      else if (!blocked(nx, p.z)) { p.x = nx; moving = true; }
      else if (!blocked(p.x, nz)) { p.z = nz; moving = true; }
      else if (goal) { goal = null; path = []; goalMark.visible = false; }   /* 走不過去就停下 */
      p.y = groundY(p.x, p.z);
      const want = Math.atan2(mv.x, mv.z); let d = want - player.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); player.rotation.y += d * Math.min(1, dt * 12);
    }
    /* 走路時身體上下晃、左右擺 */
    body.position.y = moving ? Math.abs(Math.sin(T * 11)) * 0.05 : 0; body.rotation.z = moving ? Math.sin(T * 11) * 0.06 : 0;
    goalMark.rotation.y += dt; goalMark.material.opacity = 0.4 + Math.sin(T * 6) * 0.2;

    /* 身邊有誰：路人優先，其次是建物 */
    const px = player.position.x, pz = player.position.z;
    /* 最近的那一位轉頭看你 */
    let near = null, best = 9, nearN = null;
    for (const n of npcObjs) {
      const d = Math.hypot(n.g.position.x - px, n.g.position.z - pz);
      if (d < NEAR_NPC && d < best) { best = d; nearN = n; near = { kind: 'npc', id: n.id, label: n.who }; }
    }
    if (nearN) { nearN.g.rotation.y = Math.atan2(px - nearN.g.position.x, pz - nearN.g.position.z); }
    if (!near) { best = 9; for (const b of boxes) { const d = boxDist(b, px, pz); if (d < NEAR_SPOT && d < best) { best = d; near = { kind: 'spot', id: b.id }; } } }
    if (near && near.kind === 'spot' && goalSpot === near.id && !goal) goalSpot = null;
    emitNear(near);

    /* 鏡頭：跟在小人後上方；中間被建物擋住就拉近。剛進來的 1.6 秒從原本的位置飛過來 */
    const tg = camTgt.set(px, player.position.y + 0.55, pz);
    const hitAt = (d, p) => { const x = px + Math.sin(yaw) * d * Math.cos(p), y = tg.y + Math.sin(p) * d, z = pz + Math.cos(yaw) * d * Math.cos(p); return boxes.some(b => b.solid && y < b.top + 0.2 && x > b.x0 - 0.2 && x < b.x1 + 0.2 && z > b.z0 - 0.2 && z < b.z1 + 0.2); };
    const lineHit = (D, p) => { for (let d = 0.6; d <= D; d += 0.2) if (hitAt(d, p)) return d; return 0; };
    /* 被建物擋住：先把鏡頭抬高越過去，抬到快正上方還擋才拉近 */
    let wantP = pitch, wantD = 4.8;
    if (lineHit(4.8, pitch)) { wantP = 1.35; for (let p = pitch + 0.1; p <= 1.35; p += 0.08) if (!lineHit(4.8, p)) { wantP = p; break; } const h = lineHit(4.8, wantP); if (h) wantD = Math.max(1.6, h - 0.3); }
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

  return { enter, exit, update, goTo, dispose, treeHidden, get active() { return state.active; } };
}
