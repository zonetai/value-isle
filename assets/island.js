/* ============================================================
   價值島 — 3D 島嶼場景（Three.js）
   四個層次：天空的政策氣候、外海的國際洋流、岸邊的市場潮位、島上的個別條件
   ============================================================ */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const D = window.DATA, VI = window.VI;
const wrap = document.getElementById('island-canvas');
const labelWrap = document.getElementById('island-labels');
const loader = document.getElementById('loader');
const setProgress = p => { const b = loader.querySelector('.bar i'); if(b) b.style.width = p + '%'; };

/* ---------- 基本場景 ---------- */
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xdff1f7, 38, 95);
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 300);
camera.position.set(18, 13, 20);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
} catch (e) {
  loader.classList.add('off');
  document.querySelector('.fallback-scene')?.classList.add('on');
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
wrap.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer({ element: labelWrap });

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 9;
controls.maxDistance = 48;
controls.maxPolarAngle = Math.PI * 0.46;
controls.minPolarAngle = 0.15;
controls.target.set(0, 0.5, 0);
controls.autoRotate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
controls.autoRotateSpeed = 0.35;

/* ---------- 燈光 ---------- */
const hemi = new THREE.HemisphereLight(0xdff1f7, 0x6fae5a, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4e0, 1.6);
sun.position.set(14, 22, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -22; sun.shadow.camera.right = 22;
sun.shadow.camera.top = 22; sun.shadow.camera.bottom = -22;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 80;
sun.shadow.bias = -0.0005;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xbfe3f5, 0.35);
fill.position.set(-10, 8, -14);
scene.add(fill);

/* ---------- 工具 ---------- */
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, metalness: 0.02, ...extra });
const mesh = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; };
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const lerp = (a, b, t) => a + (b - a) * t;
const pops = [];          // 會「長出來」的物件
const pop = (o, delay = 0) => { o.userData.pop = { delay, t: 0 }; o.userData.popScale = o.scale.clone(); o.scale.setScalar(0.001); pops.push(o); return o; };

/* ---------- 海 ---------- */
const seaGeo = new THREE.PlaneGeometry(140, 140, 64, 64);
seaGeo.rotateX(-Math.PI / 2);
const seaBase = seaGeo.attributes.position.array.slice();
const seaMat = mat(0x2f8fb4, { roughness: 0.55, metalness: 0.15, transparent: true, opacity: 0.96 });
const sea = new THREE.Mesh(seaGeo, seaMat);
sea.receiveShadow = true;
scene.add(sea);

/* ---------- 島本體（會從海裡浮上來） ---------- */
const island = new THREE.Group();
island.position.y = -10;
scene.add(island);
const hexPrism = (rTop, rBot, h, color, y) => { const g = new THREE.CylinderGeometry(rTop, rBot, h, 9); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const r = Math.hypot(x, z); if (r > 0.1) { const a = Math.atan2(z, x); const k = 1 + 0.06 * Math.sin(a * 3 + 0.7) + 0.04 * Math.cos(a * 5); p.setX(i, x * k * 1.12); p.setZ(i, z * k * 0.92); } } g.computeVertexNormals(); const m = mesh(g, mat(color), 0, y, 0); return m; };
const rock = hexPrism(7.6, 6.4, 2.8, 0x8a7656, -1.9);
const sand = hexPrism(7.1, 7.7, 0.5, 0xe6d2a3, -0.3);
const grass = hexPrism(6.3, 7.1, 0.7, 0x7fbf63, 0.2);
island.add(rock, sand, grass);
const TOP = 0.55;

/* 小島（衛星島） */
const islets = [];
[[-12, -7, 1.6], [11, -10, 1.3], [13, 6, 1.1]].forEach(([x, z, r], i) => {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(r, r * 0.8, 1.6, 7), mat(0x8a7656), 0, -0.9, 0));
  g.add(mesh(new THREE.CylinderGeometry(r * 0.9, r, 0.4, 7), mat(0x7fbf63), 0, 0.1, 0));
  const t = tree(r * 0.5); t.position.set(0.2, 0.3, 0); g.add(t);
  g.position.set(x, -6, z);
  g.userData.riseDelay = 0.4 + i * 0.2;
  scene.add(g); islets.push(g);
});

function tree(s = 1) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.08 * s, 0.1 * s, 0.5 * s, 5), mat(0x7a5a3a), 0, 0.25 * s, 0));
  const c1 = mesh(new THREE.ConeGeometry(0.42 * s, 0.9 * s, 6), mat(0x3f8f3a), 0, 0.8 * s, 0);
  const c2 = mesh(new THREE.ConeGeometry(0.3 * s, 0.7 * s, 6), mat(0x4da043), 0, 1.25 * s, 0);
  g.add(c1, c2);
  g.userData.tree = true;
  return g;
}

/* ============================================================
   04 個別條件：島上的建物、道路、捷運、電塔、樹
   ============================================================ */
const zoneInd = new THREE.Group(); zoneInd.userData.layer = 'ind'; island.add(zoneInd);

// 道路
const road = mesh(new THREE.BoxGeometry(10.5, 0.06, 1.1), mat(0x6b6b6b), 0, TOP + 0.03, 0.9);
road.rotation.y = -0.35; zoneInd.add(road);
for (let i = -4; i <= 4; i++) { const d = mesh(new THREE.BoxGeometry(0.5, 0.07, 0.08), mat(0xffffff), i * 1.1, TOP + 0.04, 0.9); d.rotation.y = -0.35; d.position.x = Math.cos(-0.35) * i * 1.1; d.position.z = 0.9 + Math.sin(-0.35) * i * 1.1; zoneInd.add(d); }

// 新建大樓（高）
const tower = new THREE.Group();
tower.add(mesh(new THREE.BoxGeometry(1.5, 5.4, 1.5), mat(0xe9eef3), 0, 2.7, 0));
for (let i = 0; i < 9; i++) { tower.add(mesh(new THREE.BoxGeometry(1.56, 0.18, 1.56), mat(0x2a6f97, { emissive: 0x0d3550, emissiveIntensity: 0.25 }), 0, 0.6 + i * 0.56, 0)); }
tower.add(mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), mat(0xc5cdd6), 0.3, 5.65, -0.3));
tower.position.set(0.9, TOP, -0.9); tower.userData.name = '新建大樓'; zoneInd.add(pop(tower, 0.2));

// 老公寓
const apt = new THREE.Group();
apt.add(mesh(new THREE.BoxGeometry(2.1, 2.1, 1.5), mat(0xd9c7a6), 0, 1.05, 0));
apt.add(mesh(new THREE.BoxGeometry(2.2, 0.12, 1.6), mat(0xb8a27c), 0, 2.15, 0));
for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) apt.add(mesh(new THREE.BoxGeometry(0.3, 0.3, 0.05), mat(0x5d5345), -0.65 + c * 0.65, 0.45 + r * 0.6, 0.77));
apt.add(mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), mat(0x9a8a6a), 0.6, 2.4, 0)); // 水塔
apt.position.set(-2.6, TOP, -1.2); apt.rotation.y = 0.25; apt.userData.name = '老公寓'; zoneInd.add(pop(apt, 0.35));

// 中樓層華廈
const mid = new THREE.Group();
mid.add(mesh(new THREE.BoxGeometry(1.7, 3.2, 1.7), mat(0xf2c9b6), 0, 1.6, 0));
for (let i = 0; i < 5; i++) mid.add(mesh(new THREE.BoxGeometry(1.76, 0.1, 1.76), mat(0xd9a48c), 0, 0.6 + i * 0.6, 0));
mid.add(mesh(new THREE.BoxGeometry(1.8, 0.14, 1.8), mat(0x7b4fa3), 0, 3.27, 0));
mid.position.set(3.3, TOP, 1.9); mid.rotation.y = -0.3; mid.userData.name = '華廈'; zoneInd.add(pop(mid, 0.5));

// 捷運站出口
const mrt = new THREE.Group();
mrt.add(mesh(new THREE.BoxGeometry(1.2, 0.5, 0.8), mat(0x2a6f97), 0, 0.25, 0));
mrt.add(mesh(new THREE.BoxGeometry(1.4, 0.08, 1.0), mat(0xdfe8f5), 0, 0.55, 0));
mrt.add(mesh(new THREE.BoxGeometry(0.3, 1.0, 0.1), mat(0x2a6f97), 0.8, 0.5, 0.3));
mrt.position.set(-1.2, TOP, 2.9); mrt.userData.name = '捷運站'; zoneInd.add(pop(mrt, 0.65));

// 高壓電塔（嫌惡設施）
const pylon = new THREE.Group();
const pm = mat(0x6e6e6e);
pylon.add(mesh(new THREE.CylinderGeometry(0.06, 0.16, 3.2, 4), pm, 0, 1.6, 0));
pylon.add(mesh(new THREE.BoxGeometry(1.4, 0.06, 0.06), pm, 0, 2.3, 0));
pylon.add(mesh(new THREE.BoxGeometry(1.0, 0.06, 0.06), pm, 0, 2.9, 0));
pylon.position.set(4.6, TOP, -2.6); pylon.userData.name = '高壓電塔'; zoneInd.add(pop(pylon, 0.8));

// 公園樹
[[-4.2, 1.6], [-3.4, 2.6], [1.6, 3.4], [2.6, -3.4], [-1.2, -3.6], [0.4, -3.9], [5.0, 0.2], [-5.0, -0.6]].forEach(([x, z], i) => { const t = tree(0.9 + (i % 3) * 0.15); t.position.set(x, TOP, z); zoneInd.add(pop(t, 0.5 + i * 0.07)); });

/* ============================================================
   03 市場潮位：岸邊潮位計、浮標
   ============================================================ */
const zoneMarket = new THREE.Group(); zoneMarket.userData.layer = 'market'; island.add(zoneMarket);
const gauge = new THREE.Group();
gauge.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 3.4, 12), mat(0xffffff, { transparent: true, opacity: 0.55, roughness: 0.3 }), 0, 1.7, 0));
const tideGeo = new THREE.CylinderGeometry(0.3, 0.3, 3.1, 12); tideGeo.translate(0, 1.55, 0);
const tideFill = mesh(tideGeo, mat(0x2b8a6e, { emissive: 0x1c5c48, emissiveIntensity: 0.4 }), 0, 0.12, 0);
tideFill.scale.y = 0.4; gauge.add(tideFill);
for (let i = 0; i < 6; i++) gauge.add(mesh(new THREE.BoxGeometry(0.2, 0.04, 0.04), mat(0x8a8178), -0.45, 0.4 + i * 0.55, 0));
gauge.add(mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.3, 8), mat(0x8a7656), 0, -0.1, 0));
gauge.position.set(-7.3, 0.1, 2.8); gauge.userData.name = '潮位計'; zoneMarket.add(gauge);

const buoys = [];
[[-10.5, 6.5, 0xe4572e], [9.5, -8.5, 0xf2c14e], [-12, -3, 0x2b8a6e]].forEach(([x, z, c]) => {
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(0.45, 10, 8), mat(c), 0, 0, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6), mat(0xffffff), 0, 0.6, 0));
  g.add(mesh(new THREE.SphereGeometry(0.12, 8, 6), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.8 }), 0, 1.05, 0));
  g.position.set(x, -4, z); g.userData.layer = 'market'; g.userData.phase = Math.random() * 6;
  scene.add(g); buoys.push(g);
});

/* ============================================================
   02 國際洋流：繞島的貨輪、洋流箭頭
   ============================================================ */
const zoneIntl = new THREE.Group(); zoneIntl.userData.layer = 'intl'; scene.add(zoneIntl);
const ship = new THREE.Group();
ship.add(mesh(new THREE.BoxGeometry(4.2, 0.8, 1.4), mat(0x3b4a5a), 0, 0.2, 0));
ship.add(mesh(new THREE.BoxGeometry(4.4, 0.15, 1.5), mat(0xc0392b), 0, -0.2, 0));
[[-1.4, 0xe4572e], [-0.5, 0xf2c14e], [0.4, 0x2b8a6e], [-1.4, 0x2a6f97, 1], [-0.5, 0xe4572e, 1]].forEach(([x, c, lvl = 0]) => ship.add(mesh(new THREE.BoxGeometry(0.85, 0.55, 1.1), mat(c), x, 0.9 + lvl * 0.55, 0)));
ship.add(mesh(new THREE.BoxGeometry(0.9, 1.3, 1.2), mat(0xffffff), 1.5, 1.25, 0));
ship.add(mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.6, 6), mat(0xe4572e), 1.7, 2.2, 0));
ship.userData.angle = 0.8; ship.position.set(0, -3, 0);
zoneIntl.add(ship);

const currents = new THREE.Group(); zoneIntl.add(currents);
[[10.2, 0.22, 16], [12.6, -0.16, 20], [16.5, 0.12, 26]].forEach(([r, speed, n]) => {
  const ring = new THREE.Group(); ring.userData.speed = speed;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    const c = mesh(new THREE.ConeGeometry(0.16, 0.55, 5), mat(0xdff4fb, { transparent: true, opacity: 0.75, emissive: 0xaadff0, emissiveIntensity: 0.4 }), Math.cos(a) * r, 0.12, Math.sin(a) * r);
    c.rotation.set(Math.PI / 2, 0, 0); c.rotation.y = -a + (speed > 0 ? 0 : Math.PI);
    c.castShadow = false;
    ring.add(c);
  }
  currents.add(ring);
});

/* ============================================================
   01 政策氣候：雲、風向標
   ============================================================ */
const zonePolicy = new THREE.Group(); zonePolicy.userData.layer = 'policy'; scene.add(zonePolicy);
const clouds = [];
const cloudMat = mat(0xffffff, { transparent: true, opacity: 0.92, roughness: 1 });
for (let i = 0; i < 7; i++) {
  const g = new THREE.Group();
  const n = 3 + (i % 3);
  for (let j = 0; j < n; j++) { const s = mesh(new THREE.SphereGeometry(0.7 + Math.random() * 0.6, 8, 6), cloudMat, (j - n / 2) * 0.9, Math.random() * 0.3, (Math.random() - 0.5) * 0.6); s.scale.y = 0.6; s.castShadow = true; s.receiveShadow = false; g.add(s); }
  g.position.set(-16 + Math.random() * 32, 6.5 + Math.random() * 2.5, -12 + Math.random() * 16);
  g.userData.speed = 0.25 + Math.random() * 0.3;
  g.scale.setScalar(0.001); g.userData.targetScale = 0.9 + Math.random() * 0.5;
  zonePolicy.add(g); clouds.push(g);
}
// 風向標（在島後方的小山上）
const hill = mesh(new THREE.ConeGeometry(1.7, 1.5, 7), mat(0x6fae5a), -3.6, TOP + 0.7, -3.6); island.add(hill);
const vane = new THREE.Group();
vane.add(mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.4, 6), mat(0x8a8178), 0, 1.2, 0));
const vaneHead = new THREE.Group();
vaneHead.add(mesh(new THREE.ConeGeometry(0.16, 0.5, 6), mat(0xc9711a), 0.45, 0, 0));
vaneHead.children[0].rotation.z = -Math.PI / 2;
vaneHead.add(mesh(new THREE.BoxGeometry(0.7, 0.05, 0.05), mat(0xc9711a), 0, 0, 0));
vaneHead.add(mesh(new THREE.BoxGeometry(0.1, 0.3, 0.05), mat(0xc9711a), -0.4, 0, 0));
vaneHead.position.y = 2.45; vane.add(vaneHead);
vane.position.set(-3.6, TOP + 1.4, -3.6); vane.userData.name = '風向標'; island.add(pop(vane, 0.9));
zonePolicy.userData.vane = vaneHead;

/* ============================================================
   居民：會在島上走動，點一下會說一句估價小知識
   ============================================================ */
const people = [];
const colors = [0xe4572e, 0x2a6f97, 0x2b8a6e, 0x7b4fa3, 0xf2c14e, 0xc0392b];
for (let i = 0; i < 6; i++) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CapsuleGeometry(0.16, 0.32, 3, 8), mat(colors[i]), 0, 0.32, 0));
  g.add(mesh(new THREE.SphereGeometry(0.15, 8, 7), mat(0xf5d2b8), 0, 0.72, 0));
  g.position.set((Math.random() - 0.5) * 6, TOP, (Math.random() - 0.5) * 6);
  g.userData = { person: true, fact: i, target: null, wait: Math.random() * 2 };
  island.add(pop(g, 1.1 + i * 0.1)); people.push(g);
}
const randomSpot = () => { const a = Math.random() * Math.PI * 2, r = 1.5 + Math.random() * 3.6; return new THREE.Vector3(Math.cos(a) * r, TOP, Math.sin(a) * r); };

/* ============================================================
   標示（CSS2D）
   ============================================================ */
const pins = {};
const makePin = (text, num, layer, parent, pos, small = false) => {
  const el = document.createElement('div');
  el.className = 'pin' + (small ? ' small' : '');
  el.innerHTML = num ? `<i class="dot" style="background:${(D.layers.find(l => l.id === layer) || {}).hex || '#999'}"></i>${text}<span class="num">${num}</span>` : text;
  el.dataset.layer = layer || '';
  if (layer) el.onclick = e => { e.stopPropagation(); API.select(layer, true); };
  const o = new CSS2DObject(el); o.position.copy(pos); parent.add(o);
  if (layer && !small) pins[layer] = el;
  return o;
};
makePin('政策氣候', '01', 'policy', zonePolicy, new THREE.Vector3(-3, 8.6, -3));
makePin('國際洋流', '02', 'intl', ship, new THREE.Vector3(0, 3.4, 0));
makePin('市場潮位', '03', 'market', gauge, new THREE.Vector3(0, 4.1, 0));
makePin('個別條件', '04', 'ind', tower, new THREE.Vector3(0, 6.6, 0));
makePin('捷運站', '', null, mrt, new THREE.Vector3(0, 1.3, 0), true);
makePin('高壓電塔', '', null, pylon, new THREE.Vector3(0, 3.6, 0), true);
makePin('老公寓', '', null, apt, new THREE.Vector3(0, 3.0, 0), true);
makePin('風向標', '', null, vane, new THREE.Vector3(0, 3.0, 0), true);

/* ============================================================
   季節：燈光、海色、霧色
   ============================================================ */
const SEASON = {
  spring: { sky: 0xdff1f7, ground: 0x6fae5a, hemiI: 0.9, sun: 0xfff4e0, sunI: 1.6, sea: 0x2f8fb4, fog: 0xdff1f7, grass: 0x7fbf63, cloud: 0xffffff, vane: -0.6 },
  summer: { sky: 0xbfe3f5, ground: 0x7fbf63, hemiI: 1.0, sun: 0xffffff, sunI: 2.0, sea: 0x1f9ac4, fog: 0xbfe3f5, grass: 0x8ccb66, cloud: 0xffffff, vane: 0.6 },
  autumn: { sky: 0xf3dcc4, ground: 0x9a8a4a, hemiI: 0.85, sun: 0xffc98a, sunI: 1.4, sea: 0x3b86a0, fog: 0xf3dcc4, grass: 0xa8b55a, cloud: 0xfff3e6, vane: 2.0 },
  winter: { sky: 0xcfd8e2, ground: 0x7a8a7a, hemiI: 0.75, sun: 0xdfe8f5, sunI: 1.05, sea: 0x5a7f94, fog: 0xcfd8e2, grass: 0x8fae8a, cloud: 0xe6ebf0, vane: 3.4 }
};
const cur = { sky: new THREE.Color(0xdff1f7), ground: new THREE.Color(0x6fae5a), sun: new THREE.Color(0xfff4e0), sea: new THREE.Color(0x2f8fb4), fog: new THREE.Color(0xdff1f7), grass: new THREE.Color(0x7fbf63), cloud: new THREE.Color(0xffffff), hemiI: 0.9, sunI: 1.6, vane: -0.6 };
let target = { ...SEASON.spring };
let tideLevel = 0.4;
VI.onSeason((s, data) => { target = SEASON[s]; tideLevel = data.tide; });

/* ============================================================
   互動：點選、高亮、導覽
   ============================================================ */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let down = null;
renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!down) return; const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]); down = null; if (moved > 6) return;
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(scene.children, true);
  for (const h of hits) {
    let o = h.object, layer = null, person = null;
    while (o) { if (o.userData.person) person = o; if (o.userData.layer) { layer = o.userData.layer; break; } o = o.parent; }
    if (person) { const facts = D.facts.concat(window.KN ? window.KN.facts : []); VI.toast('🙂 ' + facts[Math.floor(Math.random() * facts.length)], 3200); person.userData.jump = 1; return; }
    if (layer) { API.select(layer, true); return; }
    if (h.object === sea) { API.select(null); return; }
  }
});

let active = null;
const zoneOf = { policy: zonePolicy, intl: zoneIntl, market: zoneMarket, ind: zoneInd };
const API = window.ISLAND = {
  select(layer, openDrawer = false) {
    active = (active === layer) ? null : layer;
    Object.entries(pins).forEach(([k, el]) => el.classList.toggle('active', k === active));
    document.dispatchEvent(new CustomEvent('island:select', { detail: { layer: active } }));
    if (openDrawer && active) VI.openDrawer(active);
  },
  highlight(layer) { active = layer; Object.entries(pins).forEach(([k, el]) => el.classList.toggle('active', k === active)); },
  labels(on) { labelWrap.classList.toggle('hidden', !on); },
  currents(on) { currents.visible = on; },
  pause(on) { paused = on; controls.autoRotate = !on && !tour.on; },
  bird() { flyTo([0.01, 34, 0.01], [0, 0, 0], 1.8); },
  home() { flyTo([18, 13, 20], [0, 0.5, 0], 1.8); },
  startTour() { tour.on = true; tour.i = -1; tour.t = 0; controls.autoRotate = false; controls.enabled = false; nextStop(); document.getElementById('tour').classList.add('on'); },
  stopTour() { tour.on = false; controls.enabled = true; controls.autoRotate = !paused; document.getElementById('tour').classList.remove('on'); API.highlight(null); API.home(); },
  tourNext() { nextStop(); },
  tourPrev() { tour.i = Math.max(-1, tour.i - 2); nextStop(); }
};

/* 鏡頭飛行 */
const fly = { on: false, t: 0, dur: 2, p0: new THREE.Vector3(), p1: new THREE.Vector3(), t0: new THREE.Vector3(), t1: new THREE.Vector3() };
function flyTo(pos, tgt, dur = 2.2) {
  fly.on = true; fly.t = 0; fly.dur = dur;
  fly.p0.copy(camera.position); fly.p1.set(...pos);
  fly.t0.copy(controls.target); fly.t1.set(...tgt);
}
/* 導覽 */
const tour = { on: false, i: -1, t: 0 };
const tourEl = document.getElementById('tour');
function nextStop() {
  tour.i++;
  if (tour.i >= D.tour.length) { API.stopTour(); return; }
  const s = D.tour[tour.i]; tour.t = 0;
  flyTo(s.pos, s.target, 2.4);
  API.highlight(s.layer);
  tourEl.querySelector('.kicker').textContent = `估價師帶路 ${tour.i + 1} / ${D.tour.length}`;
  tourEl.querySelector('h4').textContent = s.title;
  tourEl.querySelector('p').textContent = s.text;
}

/* ============================================================
   動畫迴圈
   ============================================================ */
let paused = false, rise = 0, started = false, t = 0;
const clock = new THREE.Clock();
let loaded = false;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!paused) t += dt;

  // 海浪
  if (!paused) {
    const p = seaGeo.attributes.position; const a = p.array;
    for (let i = 0; i < a.length; i += 3) { const x = seaBase[i], z = seaBase[i + 2]; a[i + 1] = Math.sin(x * 0.45 + t * 1.1) * 0.13 + Math.cos(z * 0.38 + t * 0.8) * 0.13 + Math.sin((x + z) * 0.2 + t * 0.5) * 0.08; }
    p.needsUpdate = true; seaGeo.computeVertexNormals();
  }

  // 島浮出水面
  if (rise < 1) { rise = Math.min(1, rise + dt / 2.0); const e = easeOut(rise); island.position.y = lerp(-10, 0, e); island.rotation.y = lerp(-0.4, 0, e); if (rise > 0.55 && !loaded) { loaded = true; loader.classList.add('off'); } }
  islets.forEach(g => { const r = Math.max(0, Math.min(1, (rise - g.userData.riseDelay * 0.5) / 0.5)); g.position.y = lerp(-6, -0.2, easeOut(r)); });
  buoys.forEach(g => { const r = Math.max(0, Math.min(1, (rise - 0.5) / 0.5)); g.position.y = lerp(-4, 0.1 + Math.sin(t * 1.6 + g.userData.phase) * 0.14, easeOut(r)); g.rotation.z = Math.sin(t * 1.2 + g.userData.phase) * 0.12; });
  clouds.forEach(c => { const s = c.userData.targetScale; c.scale.setScalar(lerp(c.scale.x, rise > 0.3 ? s : 0.001, 0.04)); if (!paused) { c.position.x += c.userData.speed * dt; if (c.position.x > 20) c.position.x = -20; } });
  // 物件長出來
  if (rise > 0.75) pops.forEach(o => { const pp = o.userData.pop; pp.t = Math.min(1, pp.t + dt / 0.7 * (t > pp.delay + 1.2 ? 1 : 0)); const s = o.userData.popScale; const k = 1 + Math.sin(pp.t * Math.PI) * 0.12; o.scale.set(s.x * easeOut(pp.t) * k, s.y * easeOut(pp.t) * k, s.z * easeOut(pp.t) * k); if (pp.t === 0) o.scale.setScalar(0.001); });

  // 貨輪繞島
  if (!paused) ship.userData.angle += dt * 0.09;
  { const a = ship.userData.angle, r = 13.5; ship.position.set(Math.cos(a) * r, lerp(-3, 0.05, easeOut(Math.min(1, rise * 1.4))) + Math.sin(t * 1.3) * 0.08, Math.sin(a) * r); ship.rotation.y = -a + Math.PI; ship.rotation.z = Math.sin(t * 0.9) * 0.03; }
  // 洋流
  if (!paused) currents.children.forEach(r => { r.rotation.y += r.userData.speed * dt; });
  // 潮位計
  tideFill.scale.y = lerp(tideFill.scale.y, tideLevel, 0.03);
  // 風向標
  zonePolicy.userData.vane.rotation.y = lerp(zonePolicy.userData.vane.rotation.y, cur.vane, 0.04);

  // 居民走動
  if (!paused) people.forEach(g => {
    const u = g.userData;
    if (u.jump) { u.jump = Math.max(0, u.jump - dt * 2.2); }
    g.children[0].position.y = 0.32 + Math.sin(u.jump * Math.PI) * 0.5; g.children[1].position.y = 0.72 + Math.sin(u.jump * Math.PI) * 0.5;
    if (u.wait > 0) { u.wait -= dt; return; }
    if (!u.target) u.target = randomSpot();
    const d = u.target.clone().sub(g.position); d.y = 0;
    if (d.length() < 0.1) { u.target = null; u.wait = 0.5 + Math.random() * 2.5; return; }
    d.normalize(); g.position.addScaledVector(d, dt * 0.9); g.rotation.y = Math.atan2(d.x, d.z);
    g.children[0].rotation.x = Math.sin(t * 9) * 0.08;
  });

  // 高亮脈動
  Object.entries(zoneOf).forEach(([k, z]) => { const on = k === active; z.traverse(o => { if (o.isMesh && o.material && o.material.emissive && !o.userData.keepEm) { const base = o.userData.baseEm ?? (o.userData.baseEm = o.material.emissiveIntensity || 0); o.material.emissiveIntensity = on ? base + 0.35 + Math.sin(t * 4) * 0.2 : base; if (on && o.userData.emColor === undefined) { o.userData.emColor = o.material.emissive.getHex(); o.material.emissive.set(D.layers.find(l => l.id === k).hex); } else if (!on && o.userData.emColor !== undefined) { o.material.emissive.setHex(o.userData.emColor); delete o.userData.emColor; } } }); });

  // 季節色彩漸變
  const k = 0.03;
  cur.sky.lerp(new THREE.Color(target.sky), k); cur.ground.lerp(new THREE.Color(target.ground), k); cur.sun.lerp(new THREE.Color(target.sun), k);
  cur.sea.lerp(new THREE.Color(target.sea), k); cur.fog.lerp(new THREE.Color(target.fog), k); cur.grass.lerp(new THREE.Color(target.grass), k); cur.cloud.lerp(new THREE.Color(target.cloud), k);
  cur.hemiI = lerp(cur.hemiI, target.hemiI, k); cur.sunI = lerp(cur.sunI, target.sunI, k); cur.vane = target.vane;
  hemi.color.copy(cur.sky); hemi.groundColor.copy(cur.ground); hemi.intensity = cur.hemiI;
  sun.color.copy(cur.sun); sun.intensity = cur.sunI; seaMat.color.copy(cur.sea); scene.fog.color.copy(cur.fog); grass.material.color.copy(cur.grass); hill.material.color.copy(cur.grass); cloudMat.color.copy(cur.cloud);

  // 鏡頭飛行 / 導覽
  if (fly.on) { fly.t = Math.min(1, fly.t + dt / fly.dur); const e = easeInOut(fly.t); camera.position.lerpVectors(fly.p0, fly.p1, e); controls.target.lerpVectors(fly.t0, fly.t1, e); if (fly.t === 1) fly.on = false; }
  if (tour.on) { const s = D.tour[tour.i]; tour.t += dt; tourEl.querySelector('.bar i').style.width = Math.min(100, tour.t / s.dur * 100) + '%'; if (tour.t >= s.dur) nextStop(); }

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

/* ---------- 尺寸 ---------- */
function resize() {
  const w = wrap.clientWidth, h = wrap.clientHeight;
  camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.setSize(w, h); labelRenderer.setSize(w, h);
}
new ResizeObserver(resize).observe(wrap);
resize();
setProgress(70);
requestAnimationFrame(() => { setProgress(100); animate(); });
