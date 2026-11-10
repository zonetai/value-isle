/* ============================================================
   價值島 — 3D 島嶼場景 v2（Three.js，全部程式生成）
   天空＝政策氣候、外海＝國際海象、岸邊＝市場潮位、島上＝個別條件
   季節同時決定光線：復甦清晨、擴張正午、盤整黃昏、收縮夜晚
   ============================================================ */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const D = window.DATA, VI = window.VI, KN = window.KN || {};
const wrap = document.getElementById('island-canvas');
const labelWrap = document.getElementById('island-labels');
const loader = document.getElementById('loader');
const tourEl = document.getElementById('tour');
const setProgress = p => { const b = loader.querySelector('.bar i'); if (b) b.style.width = p + '%'; };
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 小工具 ---------- */
const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeBack = t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rand = rng(20261105);
const hash2 = (x, z) => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); };

/* ---------- 島的形狀（JS 與海面著色器共用同一條公式） ---------- */
const SX = 1.1, SZ = 0.94, BASE = 8.2, TOP = 0.55, HILL = [-0.9, -3.4];
const shapeR = a => BASE * (1 + 0.07 * Math.sin(3 * a + 0.7) + 0.045 * Math.cos(5 * a) + 0.02 * Math.sin(9 * a + 1.3));
const P = (t, a) => { const r = t * shapeR(a); return [r * Math.cos(a) * SX, r * Math.sin(a) * SZ]; };
const tOf = (x, z) => { const ux = x / SX, uz = z / SZ; return Math.hypot(ux, uz) / shapeR(Math.atan2(uz, ux)); };
const profile = t => t < 0.78 ? TOP : t < 1.0 ? TOP * (1 - smooth(0.78, 1.0, t)) : -2.6 * smooth(1.0, 1.4, t);
function groundY(x, z) {
  const t = tOf(x, z); let y = profile(t);
  if (t < 0.8) { const dx = x - HILL[0], dz = z - HILL[1]; y += 1.7 * Math.exp(-(dx * dx + dz * dz) / 1.5) * (1 - smooth(0.6, 0.8, t)); }
  return y;
}
function shoreT(sea) { for (let t = 0.78; t < 1.4; t += 0.004) if (profile(t) <= sea) return t; return 1.4; }

/* ---------- 場景 ---------- */
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xfbeedd, 36, 100);
const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 400);
const HOME = new THREE.Vector3(19, 12.5, 21), INTRO = new THREE.Vector3(34, 25, 40), CENTER = new THREE.Vector3(0, 0.8, 0);
camera.position.copy(INTRO);

let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
catch (e) { loader.classList.add('off'); document.querySelector('.fallback-scene')?.classList.add('on'); throw e; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
wrap.appendChild(renderer.domElement);
const labelRenderer = new CSS2DRenderer({ element: labelWrap });

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.06;
controls.minDistance = 8; controls.maxDistance = 52;
controls.maxPolarAngle = Math.PI * 0.47; controls.minPolarAngle = 0.12;
controls.target.copy(CENTER);
controls.autoRotate = !reduceMotion; controls.autoRotateSpeed = 0.3;
controls.enabled = false;

/* ---------- 燈光 ---------- */
const hemi = new THREE.HemisphereLight(0xdff1f7, 0x7fae62, 0.95); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dc, 1.75);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 110 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight(0xbfe3f5, 0.3); fill.position.set(-12, 9, -14); scene.add(fill);

/* ---------- 材質與幾何輔助 ---------- */
let curLayer = null;
const layerMats = { policy: new Set(), intl: new Set(), market: new Set(), ind: new Set() };
const matCache = new Map();
function M(color, o = {}) {
  const key = (curLayer || '_') + '|' + color + '|' + JSON.stringify(o);
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, metalness: 0.02, ...o });
    m.userData.e0 = m.emissive.clone();
    if (curLayer) layerMats[curLayer].add(m);
    matCache.set(key, m);
  }
  return m;
}
const asMat = (c, o) => typeof c === 'number' ? M(c, o) : c;
function mesh(geo, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; }
const box = (w, h, d, c, x, y, z, o) => mesh(new THREE.BoxGeometry(w, h, d), asMat(c, o), x, y, z);
const cyl = (rt, rb, h, n, c, x, y, z, o) => mesh(new THREE.CylinderGeometry(rt, rb, h, n), asMat(c, o), x, y, z);
const ball = (r, c, x, y, z, o, det = 1) => mesh(new THREE.IcosahedronGeometry(r, det), asMat(c, o), x, y, z);
const cone = (r, h, n, c, x, y, z, o) => mesh(new THREE.ConeGeometry(r, h, n), asMat(c, o), x, y, z);
const grp = layer => { const g = new THREE.Group(); if (layer) g.userData.layer = layer; return g; };
const noRay = o => { o.raycast = () => {}; return o; };
const basic = (color, opacity = 1, extra = {}) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: false, ...extra });

/* 窗戶：白天是玻璃，入夜會亮 */
const WIN = [0xffd98a, 0xbfe1ff, 0xfff1c4, 0x8fa4b8].map((e, i) => {
  const m = new THREE.MeshStandardMaterial({ color: 0x3d566f, roughness: 0.25, metalness: 0.35, emissive: e, emissiveIntensity: 0, flatShading: true });
  m.userData.k = i === 3 ? 0.12 : 0.75 + i * 0.15; return m;
});
const win = () => WIN[Math.floor(rand() * WIN.length)];
const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff3d6, emissive: 0xffd9a0, emissiveIntensity: 0.2 });
const blinkMat = new THREE.MeshStandardMaterial({ color: 0xff5544, emissive: 0xff3322, emissiveIntensity: 1 });

/* 會「長出來」的物件 */
const pops = [];
const pop = (o, delay = 0) => { o.userData.pop = { delay, s: o.scale.clone() }; o.scale.setScalar(0.0001); pops.push(o); return o; };

/* 沿路徑鋪設的帶狀面（道路、軌道、步道），高度貼地 */
function ribbon(pts, width, color, yOff, closed, o) {
  const n = pts.length, pos = [], idx = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    let dx, dz;
    if (!closed && i === 0) { dx = b[0] - p[0]; dz = b[1] - p[1]; }
    else if (!closed && i === n - 1) { dx = p[0] - a[0]; dz = p[1] - a[1]; }
    else { dx = b[0] - a[0]; dz = b[1] - a[1]; }
    const l = Math.hypot(dx, dz) || 1, nx = -dz / l * width / 2, nz = dx / l * width / 2;
    const xl = p[0] + nx, zl = p[1] + nz, xr = p[0] - nx, zr = p[1] - nz;
    pos.push(xl, groundY(xl, zl) + yOff, zl, xr, groundY(xr, zr) + yOff, zr);
  }
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) { const a = i * 2, b = a + 1, c = ((i + 1) % n) * 2, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const r = new THREE.Mesh(g, M(color, { side: THREE.DoubleSide, roughness: 0.95, ...o })); r.receiveShadow = true; return r;
}

/* ============================================================
   天空穹頂
   ============================================================ */
const skyU = { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color() }, uStars: { value: 0 }, uTime: { value: 0 } };
const sky = noRay(new THREE.Mesh(new THREE.SphereGeometry(150, 32, 20), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform vec3 uTop, uHor, uSunCol, uSunDir; uniform float uStars, uTime; varying vec3 vDir;
    float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    void main(){
      vec3 d = normalize(vDir);
      vec3 col = mix(uHor, uTop, pow(clamp(d.y, 0.0, 1.0), 0.55));
      float s = max(dot(d, normalize(uSunDir)), 0.0);
      col += uSunCol * (pow(s, 420.0) * 1.8 + pow(s, 26.0) * 0.22 + pow(s, 4.0) * 0.07);
      vec3 g = floor(d * 95.0);
      float st = step(0.9968, hash(g)) * (0.6 + 0.4 * sin(uTime * 2.0 + hash(g + 1.0) * 40.0));
      col += vec3(st * uStars * smoothstep(0.03, 0.3, d.y));
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
})));
sky.renderOrder = -10; scene.add(sky);

/* ============================================================
   海面：頂點波浪＋岸邊浪花＋淺水透色
   ============================================================ */
const waterU = {
  uTime: { value: 0 }, uDeep: { value: new THREE.Color() }, uShallow: { value: new THREE.Color() }, uFoam: { value: new THREE.Color(0xffffff) },
  uSky: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color() },
  uShoreT: { value: 1 }, uFoamAmt: { value: 0 }, uFogCol: { value: new THREE.Color() }, uFogNear: { value: 36 }, uFogFar: { value: 100 }
};
const water = new THREE.Mesh(new THREE.PlaneGeometry(190, 190, 190, 190).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
  uniforms: waterU, transparent: true,
  vertexShader: `
    uniform float uTime; varying vec3 vW; varying float vDepth;
    void main(){
      vec4 w = modelMatrix * vec4(position, 1.0);
      float a = sin(w.x * 0.42 + uTime * 1.05) * 0.11 + cos(w.z * 0.37 + uTime * 0.8) * 0.11 + sin((w.x + w.z) * 0.21 + uTime * 0.5) * 0.08 + sin(w.x * 1.3 - w.z * 0.9 + uTime * 1.7) * 0.035;
      a *= smoothstep(6.0, 14.0, length(w.xz)) * 0.8 + 0.2;
      w.y += a; vW = w.xyz;
      vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    uniform vec3 uDeep, uShallow, uFoam, uSky, uSunCol, uSunDir, uFogCol; uniform float uTime, uShoreT, uFoamAmt, uFogNear, uFogFar;
    varying vec3 vW; varying float vDepth;
    float shapeR(float a){ return ${BASE.toFixed(2)} * (1.0 + 0.07 * sin(3.0 * a + 0.7) + 0.045 * cos(5.0 * a) + 0.02 * sin(9.0 * a + 1.3)); }
    void main(){
      vec3 n = normalize(cross(dFdx(vW), dFdy(vW))); if (n.y < 0.0) n = -n;
      vec2 u = vec2(vW.x / ${SX.toFixed(2)}, vW.z / ${SZ.toFixed(2)});
      float a = atan(u.y, u.x); float t = length(u) / shapeR(a); float d = t - uShoreT;
      vec3 V = normalize(cameraPosition - vW); vec3 L = normalize(uSunDir);
      vec3 col = mix(uShallow, uDeep, smoothstep(0.0, 0.7, d));
      col *= 0.74 + 0.36 * clamp(dot(n, L), 0.0, 1.0);
      float fres = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 3.0);
      col = mix(col, uSky, fres * 0.5);
      col += uSunCol * pow(max(dot(reflect(-L, n), V), 0.0), 90.0) * 0.9;
      float band = sin(d * 46.0 - uTime * 1.6 + sin(a * 7.0) * 1.5) * 0.5 + 0.5;
      float foam = smoothstep(0.05, 0.0, d) * 0.95 + smoothstep(0.86, 1.0, band) * smoothstep(0.32, 0.02, d) * 0.55;
      col = mix(col, uFoam, clamp(foam, 0.0, 1.0) * uFoamAmt);
      float alpha = mix(0.6, 0.97, smoothstep(0.0, 0.26, d));
      col = mix(col, uFogCol, smoothstep(uFogNear, uFogFar, vDepth));
      gl_FragColor = vec4(col, alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
}));
water.userData.water = true; scene.add(water);
let seaY = -0.1;

/* 小島與浮標周圍的浪花圈 */
const foams = [];
function foamRing(x, z, r) {
  const m = noRay(new THREE.Mesh(new THREE.RingGeometry(r, r * 1.16, 28).rotateX(-Math.PI / 2), basic(0xffffff, 0.4)));
  m.position.set(x, 0, z); m.userData.ph = rand() * 6; scene.add(m); foams.push(m); return m;
}

/* ============================================================
   島本體：有機地形、沙灘、山丘
   ============================================================ */
const island = new THREE.Group(); island.position.y = -9; scene.add(island);
const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });
(function buildTerrain() {
  const NR = 38, NS = 108, TMAX = 1.46, pos = [0, groundY(0, 0), 0], idx = [];
  for (let i = 1; i <= NR; i++) { const t = TMAX * Math.pow(i / NR, 0.9); for (let j = 0; j < NS; j++) { const [x, z] = P(t, j / NS * TAU); pos.push(x, groundY(x, z), z); } }
  for (let j = 0; j < NS; j++) idx.push(0, 1 + (j + 1) % NS, 1 + j);
  for (let i = 1; i < NR; i++) { const r0 = 1 + (i - 1) * NS, r1 = 1 + i * NS; for (let j = 0; j < NS; j++) { const j2 = (j + 1) % NS; idx.push(r0 + j, r0 + j2, r1 + j, r0 + j2, r1 + j2, r1 + j); } }
  let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g = g.toNonIndexed(); g.computeVertexNormals();
  const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  const cG1 = new THREE.Color(0x8ccb6e), cG2 = new THREE.Color(0x72b65a), cHill = new THREE.Color(0x5b9a4e), cSand = new THREE.Color(0xeedfb2), cWet = new THREE.Color(0xd2bc8b), cDeep = new THREE.Color(0x71877f);
  for (let f = 0; f < p.count; f += 3) {
    const cx = (p.getX(f) + p.getX(f + 1) + p.getX(f + 2)) / 3, cy = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3, cz = (p.getZ(f) + p.getZ(f + 1) + p.getZ(f + 2)) / 3;
    const t = tOf(cx, cz), n = hash2(cx, cz);
    if (t < 0.8) { c.copy(cG1).lerp(cG2, n); if (cy > TOP + 0.06) c.lerp(cHill, clamp((cy - TOP) / 1.2)); }
    else if (t < 0.9) c.copy(cG2).lerp(cSand, smooth(0.8, 0.9, t));
    else if (t < 1.05) { c.copy(cSand).lerp(cWet, smooth(0.96, 1.05, t)); c.offsetHSL(0, 0, (n - 0.5) * 0.04); }
    else c.copy(cWet).lerp(cDeep, smooth(1.05, 1.32, t));
    for (let k = 0; k < 3; k++) { col[(f + k) * 3] = c.r; col[(f + k) * 3 + 1] = c.g; col[(f + k) * 3 + 2] = c.b; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, terrainMat); m.receiveShadow = true; m.castShadow = true; m.userData.layer = 'ind'; island.add(m);
})();

/* 衛星小島 */
function makeIslet(x, z, r) {
  const g = new THREE.Group();
  g.add(cyl(r, r * 0.72, 2.4, 7, 0x8a7656, 0, -1.15, 0), cyl(r * 1.02, r * 1.1, 0.22, 9, 0xeedfb2, 0, 0.02, 0), cyl(r * 0.8, r * 0.96, 0.34, 9, 0x7fbf63, 0, 0.28, 0));
  g.position.set(x, -7, z); g.rotation.y = rand() * 6; g.userData.rise = 0.3 + rand() * 0.4; scene.add(g); foamRing(x, z, r * 1.12); return g;
}
const ISLET_TOP = 0.45;
const isLH = makeIslet(10.5, 6, 1.5), isTurb = makeIslet(-11, -5.5, 2.0), isPylon = makeIslet(9.6, -5.6, 1.0), isPalm = makeIslet(-8.5, 8.5, 1.2);
const islets = [isLH, isTurb, isPylon, isPalm];

/* ============================================================
   04 個別條件：道路、輕軌、建物、都更工地、公園
   ============================================================ */
curLayer = 'ind';
const zoneInd = grp('ind'); island.add(zoneInd);

/* 主要道路 */
const RC = [0, 0.9], RANG = 0.347, RU = [Math.cos(RANG), Math.sin(RANG)], RN = [-RU[1], RU[0]], RL = 4.9;
const roadPt = (s, off = 0) => [RC[0] + RU[0] * s + RN[0] * off, RC[1] + RU[1] * s + RN[1] * off];
const roadPts = Array.from({ length: 22 }, (_, i) => roadPt(-RL + i * (2 * RL / 21)));
zoneInd.add(ribbon(roadPts, 1.75, 0xd9d1c2, 0.012), ribbon(roadPts, 1.1, 0x565a62, 0.028));
for (let s = -RL + 0.5; s < RL; s += 0.9) { const [x, z] = roadPt(s); const d = box(0.42, 0.012, 0.06, 0xf4f0e6, x, TOP + 0.04, z); d.rotation.y = -RANG; d.castShadow = false; zoneInd.add(d); }
for (let k = -2; k <= 2; k++) { const [x, z] = roadPt(-0.9 + k * 0.16); const d = box(0.09, 0.012, 0.95, 0xffffff, x, TOP + 0.042, z); d.rotation.y = -RANG; d.castShadow = false; zoneInd.add(d); }
const roadDist = (x, z) => Math.abs((x - RC[0]) * RN[0] + (z - RC[1]) * RN[1]);

/* 環島步道與輕軌 */
const ringPts = t => Array.from({ length: 150 }, (_, i) => P(t, i / 150 * TAU));
const TRAM_T = 0.66, WALK_T = 0.745;
zoneInd.add(ribbon(ringPts(WALK_T), 0.3, 0xf1e8d4, 0.014, true), ribbon(ringPts(TRAM_T), 0.44, 0x9d9687, 0.016, true),
  ribbon(ringPts(TRAM_T + 0.013), 0.045, 0x44474d, 0.034, true), ribbon(ringPts(TRAM_T - 0.013), 0.045, 0x44474d, 0.034, true));
const tramPose = a => { const [x, z] = P(TRAM_T, a), [x2, z2] = P(TRAM_T, a + 0.01); return { x, z, y: groundY(x, z) + 0.05, rot: -Math.atan2(z2 - z, x2 - x) }; };
const tram = [0, 1].map(i => {
  const g = new THREE.Group();
  g.add(box(0.95, 0.34, 0.4, 0xf7f7f2, 0, 0.27, 0), box(0.97, 0.1, 0.42, 0xe4572e, 0, 0.13, 0), box(0.8, 0.14, 0.41, WIN[1], 0, 0.32, 0), box(0.9, 0.05, 0.36, 0x8a8f96, 0, 0.47, 0));
  if (i === 0) g.add(mesh(new THREE.SphereGeometry(0.05, 6, 5), lampMat, 0.48, 0.2, 0.12), mesh(new THREE.SphereGeometry(0.05, 6, 5), lampMat, 0.48, 0.2, -0.12));
  zoneInd.add(g); return g;
});
let tramA = 0.4, tramStop = 0, tramCool = 0; const STA = 1.95;

/* 輕軌站 */
(function () {
  const p = tramPose(STA), [ix, iz] = P(TRAM_T - 0.055, STA), g = new THREE.Group();
  g.add(box(1.7, 0.1, 0.5, 0xcfc8ba, 0, 0.05, 0), box(1.5, 0.06, 0.6, 0x2a6f97, 0, 0.92, 0), box(0.5, 0.3, 0.05, 0x2a6f97, 0.5, 0.6, -0.2));
  [-0.65, 0.65].forEach(x => g.add(cyl(0.035, 0.035, 0.85, 6, 0x8a8f96, x, 0.5, -0.18)));
  g.add(box(0.5, 0.06, 0.14, 0x9a7b55, -0.3, 0.3, -0.12));
  g.position.set(ix, groundY(ix, iz), iz); g.rotation.y = p.rot; g.userData.name = '輕軌站'; zoneInd.add(pop(g, 0.5));
})();

/* 新建大樓 */
const tower = new THREE.Group();
tower.add(box(1.6, 5.6, 1.6, 0xe9eef3, 0, 2.8, 0), box(1.9, 0.5, 1.9, 0xd4dbe3, 0, 0.25, 0));
for (let i = 0; i < 9; i++) tower.add(box(1.64, 0.2, 1.64, i % 4 === 3 ? WIN[3] : WIN[1 + (i % 2) * 1], 0, 0.95 + i * 0.52, 0));
for (let i = 0; i < 9; i++) tower.add(box(0.5, 0.05, 0.22, 0xffffff, 0.45, 0.82 + i * 0.52, 0.9));
tower.add(box(1.7, 0.12, 1.7, 0x7b4fa3, 0, 5.66, 0), box(0.6, 0.45, 0.6, 0xc5cdd6, 0.3, 5.95, -0.3), cyl(0.02, 0.03, 1.1, 5, 0x8a8f96, -0.4, 6.25, 0.35), mesh(new THREE.SphereGeometry(0.06, 6, 5), blinkMat, -0.4, 6.82, 0.35));
tower.position.set(0.9, TOP, -0.9); zoneInd.add(pop(tower, 0.15));

/* 老公寓（含頂加與水塔） */
const apt = new THREE.Group();
apt.add(box(2.2, 2.2, 1.5, 0xd9c7a6, 0, 1.1, 0), box(2.3, 0.1, 1.6, 0xb8a27c, 0, 2.25, 0));
for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { apt.add(box(0.28, 0.3, 0.05, win(), -0.75 + c * 0.5, 0.95 + r * 0.55, 0.76)); apt.add(box(0.28, 0.3, 0.05, win(), -0.75 + c * 0.5, 0.95 + r * 0.55, -0.76)); }
apt.add(box(2.3, 0.06, 0.4, 0xc0392b, 0, 0.62, 0.92), box(0.36, 0.5, 0.05, 0x6b5a45, 0.3, 0.27, 0.77), box(1.3, 0.5, 1.1, 0x5f8f6f, -0.35, 2.55, 0), box(1.4, 0.05, 1.2, 0x4d7a5c, -0.35, 2.82, 0), cyl(0.22, 0.22, 0.42, 8, 0xc9d2d8, 0.7, 2.62, 0.2, { metalness: 0.5, roughness: 0.35 }));
[0.2, 0.75].forEach(x => apt.add(box(0.26, 0.18, 0.14, 0xdfe3e6, x, 1.4, 0.84)));
apt.position.set(-3.2, TOP, -1.9); apt.rotation.y = 0.3; zoneInd.add(pop(apt, 0.3));

/* 華廈 */
const mid = new THREE.Group();
mid.add(box(1.8, 3.4, 1.8, 0xf2c9b6, 0, 1.7, 0));
for (let i = 0; i < 6; i++) { mid.add(box(1.86, 0.08, 1.86, 0xd9a48c, 0, 0.55 + i * 0.52, 0)); mid.add(box(1.2, 0.22, 0.05, win(), 0, 0.85 + i * 0.52, 0.92), box(0.05, 0.22, 1.2, win(), 0.92, 0.85 + i * 0.52, 0)); }
mid.add(box(1.9, 0.14, 1.9, 0x7b4fa3, 0, 3.47, 0), box(0.5, 0.3, 0.5, 0xd9a48c, -0.4, 3.7, 0.3));
mid.position.set(2.9, TOP, 0.1); mid.rotation.y = -RANG; zoneInd.add(pop(mid, 0.45));

/* 街屋一排 */
[[-1.9, 0xf6e3b4, 1.3, 0xe4572e], [-1.0, 0xcfe3ef, 1.6, 0x2a6f97], [-0.1, 0xf4d2c8, 1.4, 0x2b8a6e], [0.8, 0xe6e0f2, 1.7, 0xc9711a]].forEach(([s, c, h, aw], i) => {
  const [x, z] = roadPt(s, 1.5), g = new THREE.Group();
  g.add(box(0.86, h, 1.0, c, 0, h / 2, 0), box(0.9, 0.06, 1.05, 0x9a8a78, 0, h + 0.03, 0), box(0.9, 0.05, 0.3, aw, 0, 0.62, -0.62), box(0.5, 0.42, 0.04, WIN[2], 0, 0.3, -0.51));
  for (let f = 1; f * 0.5 + 0.5 < h; f++) g.add(box(0.5, 0.22, 0.04, win(), 0, 0.5 + f * 0.48, -0.51));
  g.position.set(x, TOP, z); g.rotation.y = -RANG; zoneInd.add(pop(g, 0.55 + i * 0.08));
});

/* 都更工地：樓板一層層蓋上去，塔吊旋轉 */
const site = new THREE.Group(), slabs = [];
site.add(box(1.75, 0.04, 1.75, 0xcbbf9f, 0, 0.02, 0));
for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, f = box(1.8, 0.3, 0.04, i % 2 ? 0xf2c14e : 0x3a3f46, Math.sin(a) * 0.9, 0.17, Math.cos(a) * 0.9); f.rotation.y = a; site.add(f); }
for (let i = 0; i < 6; i++) { const lv = new THREE.Group(); lv.add(box(1.25, 0.07, 1.25, 0xbfc3c6, 0, 0.5, 0)); [[-.55, -.55], [.55, -.55], [-.55, .55], [.55, .55]].forEach(([x, z]) => lv.add(box(0.09, 0.5, 0.09, 0xa9adb0, x, 0.25, z))); lv.position.y = 0.04 + i * 0.5; lv.visible = false; site.add(lv); slabs.push(lv); }
const crane = new THREE.Group(); crane.add(box(0.14, 4.4, 0.14, 0xf2a71b, 0, 2.2, 0));
const craneArm = new THREE.Group(); craneArm.position.y = 4.3;
craneArm.add(box(3.0, 0.1, 0.12, 0xf2a71b, 1.2, 0.12, 0), box(1.0, 0.1, 0.12, 0xf2a71b, -0.75, 0.12, 0), box(0.4, 0.3, 0.3, 0x6b6f76, -1.1, 0, 0), box(0.3, 0.26, 0.26, 0xfaf6ea, 0.05, 0.02, 0.18), cone(0.1, 0.5, 4, 0xf2a71b, 0, 0.45, 0));
const hook = new THREE.Group(); hook.position.set(2.2, 0.08, 0);
const hookLine = box(0.02, 1, 0.02, 0x3a3f46, 0, -0.5, 0), hookLoad = box(0.3, 0.2, 0.3, 0x9a7b55, 0, -1.1, 0);
hook.add(hookLine, hookLoad); craneArm.add(hook); crane.add(craneArm); crane.position.set(-0.75, 0, -0.75); site.add(crane);
site.position.set(1.9, TOP, 3.1); site.rotation.y = -RANG; zoneInd.add(pop(site, 0.7));

/* 公園與池塘 */
const PARK = [-4.3, 2.3];
(function () {
  const g = new THREE.Group();
  const pond = mesh(new THREE.CircleGeometry(0.75, 18).rotateX(-Math.PI / 2), M(0x58b7d4, { roughness: 0.15, metalness: 0.3 }), 0, 0.03, 0); pond.castShadow = false;
  g.add(pond, mesh(new THREE.RingGeometry(0.75, 0.9, 18).rotateX(-Math.PI / 2), M(0xdcd3c0), 0, 0.025, 0));
  [[1.1, 0.2, 0.3], [-0.2, 1.15, 1.6]].forEach(([x, z, r]) => { const b = box(0.5, 0.06, 0.16, 0x9a7b55, x, 0.2, z); b.rotation.y = r; g.add(b); });
  g.add(cyl(0.5, 0.5, 0.05, 6, 0xc0392b, 1.2, 0.75, -0.9), cone(0.6, 0.35, 6, 0xc0392b, 1.2, 0.95, -0.9));
  for (let i = 0; i < 6; i++) g.add(cyl(0.03, 0.03, 0.72, 5, 0xfaf6ea, 1.2 + Math.cos(i * 1.047) * 0.42, 0.37, -0.9 + Math.sin(i * 1.047) * 0.42));
  g.position.set(PARK[0], TOP, PARK[1]); zoneInd.add(pop(g, 0.6));
})();

/* 路燈 */
const lampPos = [-4, -2, 0, 2, 4].map(s => roadPt(s, -0.78));
lampPos.forEach(([x, z]) => { const g = new THREE.Group(); g.add(cyl(0.025, 0.035, 1.05, 5, 0x5d6168, 0, 0.52, 0), box(0.22, 0.03, 0.03, 0x5d6168, 0.1, 1.04, 0), mesh(new THREE.SphereGeometry(0.07, 8, 6), lampMat, 0.2, 1.0, 0)); g.position.set(x, TOP, z); g.rotation.y = -RANG - Math.PI / 2; zoneInd.add(g); });
const lampLights = [lampPos[0], lampPos[2], lampPos[4]].map(([x, z]) => { const l = new THREE.PointLight(0xffd9a0, 0, 7, 1.6); l.position.set(x, TOP + 1.2, z); island.add(l); return l; });

/* 高壓電塔（嫌惡設施）：島上一座、外海一座，電線相連 */
function makePylon() {
  const g = new THREE.Group(), c = 0x6e737a;
  g.add(cyl(0.05, 0.2, 3.3, 4, c, 0, 1.65, 0), box(1.5, 0.05, 0.05, c, 0, 2.5, 0), box(1.0, 0.05, 0.05, c, 0, 3.05, 0), box(0.5, 0.05, 0.5, c, 0, 0.9, 0));
  return g;
}
const PY1 = (() => { const [x, z] = P(0.56, -0.62); return [x, z]; })();
const pylon1 = makePylon(); pylon1.position.set(PY1[0], TOP, PY1[1]); pylon1.rotation.y = 0.5; zoneInd.add(pop(pylon1, 0.85));
const pylon2 = makePylon(); pylon2.position.set(0, ISLET_TOP, 0); pylon2.rotation.y = 0.5; isPylon.add(pylon2);
const wires = noRay(new THREE.Group()); wires.visible = false; scene.add(wires);
[[-0.7, 2.5], [0.7, 2.5], [0, 3.05]].forEach(([off, h]) => {
  const a = new THREE.Vector3(PY1[0] + Math.cos(0.5) * off, TOP + h, PY1[1] - Math.sin(0.5) * off), b = new THREE.Vector3(9.6 + Math.cos(0.5) * off, ISLET_TOP + h, -5.6 - Math.sin(0.5) * off), pts = [];
  for (let i = 0; i <= 14; i++) { const u = i / 14, p = a.clone().lerp(b, u); p.y -= Math.sin(u * Math.PI) * 0.7; pts.push(p); }
  wires.add(noRay(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x3a3f46 }))));
});

/* 車流 */
const cars = [[0xe4572e, 1.5, 1], [0x2a6f97, 1.9, -1], [0xf2c14e, 1.2, 1], [0xfaf6ea, 1.7, -1], [0x2b8a6e, 1.0, 1]].map(([c, sp, dir], i) => {
  const g = new THREE.Group(), bus = i === 4, L = bus ? 0.8 : 0.46;
  g.add(box(L, 0.16, 0.24, c, 0, 0.14, 0), box(L * (bus ? 0.96 : 0.55), bus ? 0.2 : 0.13, 0.22, bus ? WIN[1] : 0x2c3e50, bus ? 0 : -0.03, bus ? 0.3 : 0.27, 0));
  if (bus) g.add(box(L, 0.04, 0.24, c, 0, 0.42, 0));
  g.add(mesh(new THREE.SphereGeometry(0.035, 6, 4), lampMat, L / 2, 0.14, 0.08), mesh(new THREE.SphereGeometry(0.035, 6, 4), lampMat, L / 2, 0.14, -0.08));
  g.userData = { s: -RL + 1 + i * 1.9, sp: sp * 0.7, dir }; zoneInd.add(g); return g;
});

/* 行人 */
const people = [];
[0xe4572e, 0x2a6f97, 0x2b8a6e, 0x7b4fa3, 0xf2c14e, 0xc0392b, 0x3b4a5a, 0xf29e4c, 0x5fa8d3, 0xd97aa6].forEach((c, i) => {
  const g = new THREE.Group(), s = 0.85 + rand() * 0.3;
  g.add(mesh(new THREE.CapsuleGeometry(0.13, 0.26, 3, 8), M(c), 0, 0.27, 0), mesh(new THREE.SphereGeometry(0.12, 8, 7), M(0xf5d2b8), 0, 0.6, 0));
  g.scale.setScalar(s);
  g.userData = { person: true, onRoad: i >= 7, a: rand() * TAU, s: (rand() - 0.5) * 8, dir: rand() < 0.5 ? 1 : -1, sp: 0.5 + rand() * 0.5, wait: rand() * 2, ph: rand() * 6, jump: 0, side: rand() < 0.5 ? 0.72 : -0.72 };
  island.add(pop(g, 1.0 + i * 0.07)); people.push(g);
});

/* 樹（InstancedMesh）：依季節換色 */
const leafC = new THREE.MeshStandardMaterial({ color: 0x3f8f44, flatShading: true, roughness: 0.9 });
const leafR = new THREE.MeshStandardMaterial({ color: 0x6cc05a, flatShading: true, roughness: 0.9 });
const leafB = new THREE.MeshStandardMaterial({ color: 0xf6a9c4, flatShading: true, roughness: 0.9 });
const trees = [];
(function plantTrees() {
  const obst = [[0.9, -0.9, 1.6], [-3.2, -1.9, 1.8], [2.9, 0.1, 1.6], [1.9, 3.1, 1.6], [PARK[0], PARK[1], 1.0], [PARK[0] + 1.2, PARK[1] - 0.9, 0.8], [HILL[0], HILL[1], 0.55], [PY1[0], PY1[1], 0.6]];
  [-1.9, -1.0, -0.1, 0.8].forEach(s => { const [x, z] = roadPt(s, 1.5); obst.push([x, z, 0.85]); });
  { const [x, z] = P(TRAM_T - 0.055, STA); obst.push([x, z, 1.2]); }
  const ok = (x, z) => { const t = tOf(x, z); if (t > 0.9 || Math.abs(t - TRAM_T) < 0.05 || Math.abs(t - WALK_T) < 0.035) return false; if (roadDist(x, z) < 1.15 && Math.abs((x - RC[0]) * RU[0] + (z - RC[1]) * RU[1]) < RL + 0.4) return false; return !obst.some(([ox, oz, r]) => Math.hypot(x - ox, z - oz) < r) && !trees.some(tr => Math.hypot(x - tr.x, z - tr.z) < 0.62); };
  const add = (x, z, kind) => trees.push({ x, z, y: groundY(x, z), s: 0.8 + rand() * 0.55, kind, ph: rand() * 6, rot: rand() * 6, delay: 0.3 + rand() * 1.6 });
  for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + 0.3, x = PARK[0] + Math.cos(a) * 1.45, z = PARK[1] + Math.sin(a) * 1.45; if (ok(x, z)) add(x, z, rand() < 0.5 ? 'b' : 'r'); }
  let guard = 0;
  while (trees.length < 60 && guard++ < 4000) {
    const [x, z] = P(0.08 + rand() * 0.8, rand() * TAU); if (!ok(x, z)) continue;
    const nearHill = Math.hypot(x - HILL[0], z - HILL[1]) < 2.3;
    add(x, z, rand() < (nearHill ? 0.85 : 0.28) ? 'c' : rand() < 0.38 ? 'b' : 'r');
  }
})();
const nC = trees.filter(t => t.kind === 'c').length, nR = trees.filter(t => t.kind === 'r').length, nB = trees.filter(t => t.kind === 'b').length;
const trunkGeo = new THREE.CylinderGeometry(0.06, 0.1, 0.55, 5).translate(0, 0.27, 0), coneGeo = new THREE.ConeGeometry(0.42, 0.95, 6).translate(0, 0.47, 0), roundGeo = new THREE.IcosahedronGeometry(0.5, 0);
const imTrunk = noRay(new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x7a5a3a, flatShading: true }), trees.length));
const imCone = noRay(new THREE.InstancedMesh(coneGeo, leafC, Math.max(1, nC * 2))), imRound = noRay(new THREE.InstancedMesh(roundGeo, leafR, Math.max(1, nR))), imBloom = noRay(new THREE.InstancedMesh(roundGeo, leafB, Math.max(1, nB)));
[imTrunk, imCone, imRound, imBloom].forEach(m => { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; island.add(m); });
const dummy = new THREE.Object3D();
function updateTrees(T, popT) {
  let ic = 0, ir = 0, ib = 0;
  trees.forEach((t, i) => {
    const k = popT < 0 ? 0 : easeBack(clamp((popT - t.delay) / 0.6)), s = Math.max(0.0001, t.s * k), sw = Math.sin(T * 1.2 + t.ph) * 0.045;
    dummy.position.set(t.x, t.y - 0.03, t.z); dummy.rotation.set(sw, t.rot, sw * 0.7); dummy.scale.setScalar(s); dummy.updateMatrix(); imTrunk.setMatrixAt(i, dummy.matrix);
    if (t.kind === 'c') {
      dummy.position.y = t.y + 0.38 * s; dummy.updateMatrix(); imCone.setMatrixAt(ic++, dummy.matrix);
      dummy.position.y = t.y + 0.85 * s; dummy.scale.setScalar(s * 0.7); dummy.updateMatrix(); imCone.setMatrixAt(ic++, dummy.matrix);
    } else {
      dummy.position.y = t.y + 0.8 * s; dummy.scale.set(s * 1.05, s * 0.92, s * 1.05); dummy.updateMatrix();
      if (t.kind === 'r') imRound.setMatrixAt(ir++, dummy.matrix); else imBloom.setMatrixAt(ib++, dummy.matrix);
    }
  });
  [imTrunk, imCone, imRound, imBloom].forEach(m => m.instanceMatrix.needsUpdate = true);
}
updateTrees(0, -1);

/* ============================================================
   03 市場潮位：棧橋、潮位站、浮標、躍出水面的魚、漁船
   ============================================================ */
curLayer = 'market';
const zoneMarket = grp('market'); island.add(zoneMarket);
const TM = 2.75, pA = P(0.93, TM), pB = P(1.25, TM), pLen = Math.hypot(pB[0] - pA[0], pB[1] - pA[1]), pDir = [(pB[0] - pA[0]) / pLen, (pB[1] - pA[1]) / pLen], pAng = Math.atan2(pDir[1], pDir[0]);
const pier = new THREE.Group(); pier.position.set(pA[0], 0, pA[1]); pier.rotation.y = -pAng;
pier.add(box(pLen + 0.3, 0.07, 0.75, 0xa98562, pLen / 2 - 0.1, 0.36, 0));
for (let x = 0.2; x < pLen; x += 0.7) { pier.add(cyl(0.05, 0.05, 2.0, 5, 0x7a5a3a, x, -0.6, 0.33), cyl(0.05, 0.05, 2.0, 5, 0x7a5a3a, x, -0.6, -0.33), box(0.04, 0.3, 0.04, 0x7a5a3a, x, 0.54, 0.35)); }
pier.add(box(pLen, 0.03, 0.03, 0x7a5a3a, pLen / 2, 0.68, 0.35));
const gaugeG = new THREE.Group(); gaugeG.position.set(pLen + 0.25, 0, 0);
gaugeG.add(cyl(0.5, 0.56, 0.5, 8, 0x8a8f96, 0, 0.1, 0), cyl(0.36, 0.36, 3.1, 14, 0xffffff, 0, 1.75, 0, { transparent: true, opacity: 0.32, roughness: 0.15 }), cyl(0.42, 0.42, 0.1, 14, 0x3b4a5a, 0, 3.33, 0), cone(0.3, 0.35, 8, 0xe4572e, 0, 3.55, 0));
const tideGeo = new THREE.CylinderGeometry(0.27, 0.27, 2.9, 14).translate(0, 1.45, 0);
const tideFill = mesh(tideGeo, M(0x2b8a6e, { emissive: 0x1c5c48, emissiveIntensity: 0.5 }), 0, 0.36, 0); tideFill.scale.y = 0.4;
const tideFloat = ball(0.2, 0xf29e4c, 0, 1.5, 0, { emissive: 0xa85a10, emissiveIntensity: 0.4 });
gaugeG.add(tideFill, tideFloat);
for (let i = 0; i < 7; i++) gaugeG.add(box(i % 2 ? 0.14 : 0.24, 0.035, 0.035, 0x4a443c, -0.47, 0.5 + i * 0.44, 0));
pier.add(gaugeG); zoneMarket.add(pop(pier, 0.4));
(function hut() {
  const x = pA[0] - pDir[0] * 1.0, z = pA[1] - pDir[1] * 1.0, g = new THREE.Group();
  g.add(box(0.8, 0.6, 0.65, 0xfaf6ea, 0, 0.3, 0), box(0.95, 0.07, 0.8, 0x2b8a6e, 0, 0.64, 0), box(0.34, 0.02, 0.3, 0x2c3e50, 0.15, 0.7, 0.1, { metalness: 0.6, roughness: 0.3 }), cyl(0.015, 0.015, 0.8, 4, 0x6e737a, -0.3, 1.05, -0.2), box(0.26, 0.3, 0.04, WIN[1], 0, 0.32, 0.34));
  g.position.set(x, groundY(x, z), z); g.rotation.y = -pAng + Math.PI / 2; zoneMarket.add(pop(g, 0.5));
})();
const buoys = [[-10.8, -2.3, 0xe4572e], [7.5, 9.5, 0xf2c14e], [11.5, -1.5, 0x2b8a6e]].map(([x, z, c]) => {
  const g = grp('market');
  g.add(cyl(0.34, 0.26, 0.4, 8, c, 0, 0.05, 0), cyl(0.04, 0.04, 0.9, 5, 0xffffff, 0, 0.65, 0), mesh(new THREE.SphereGeometry(0.1, 8, 6), lampMat, 0, 1.12, 0));
  g.position.set(x, -4, z); g.userData.ph = rand() * 6; scene.add(g); foamRing(x, z, 0.5); return g;
});
const fishes = [0, 1].map(i => { const g = grp('market'); g.add(mesh(new THREE.ConeGeometry(0.12, 0.5, 5).rotateZ(-Math.PI / 2), M(0x9fc4d8, { metalness: 0.4, roughness: 0.3 })), mesh(new THREE.ConeGeometry(0.12, 0.2, 4).rotateZ(Math.PI / 2), M(0x7fa6bd), -0.3, 0, 0)); g.visible = false; g.userData = { next: 4 + i * 5, u: -1, base: [0, 0], ang: 0 }; scene.add(g); return g; });
function makeBoat(c) { const g = new THREE.Group(); g.add(box(0.9, 0.2, 0.36, c, 0, 0.08, 0), cone(0.18, 0.36, 4, c, 0.6, 0.08, 0).rotateZ(-Math.PI / 2), box(0.3, 0.26, 0.26, 0xfaf6ea, -0.15, 0.3, 0), mesh(new THREE.SphereGeometry(0.05, 6, 4), lampMat, -0.15, 0.48, 0)); return g; }
const boats = [[-11.4, 6.4, 0x2a6f97, 0.6], [-12.7, 2.0, 0xc0392b, -1.2]].map(([x, z, c, r]) => { const g = makeBoat(c); g.userData = { layer: 'market', ph: rand() * 6, r }; g.position.set(x, -4, z); g.rotation.y = r; scene.add(g); return g; });

/* ============================================================
   02 國際海象：貨櫃輪、油輪、帆船、客機、海流箭頭
   ============================================================ */
curLayer = 'intl';
const zoneIntl = grp('intl'); scene.add(zoneIntl);
function hullGeo(L, W, H) { const s = new THREE.Shape(); s.moveTo(-L, -W * 0.85); s.lineTo(L * 0.55, -W); s.lineTo(L, 0); s.lineTo(L * 0.55, W); s.lineTo(-L, W * 0.85); s.lineTo(-L * 1.08, 0); s.closePath(); return new THREE.ExtrudeGeometry(s, { depth: H, bevelEnabled: false }).rotateX(-Math.PI / 2); }
const ship = new THREE.Group();
ship.add(mesh(hullGeo(2.4, 0.72, 0.9), M(0x2f3e4e), 0, -0.3, 0), mesh(hullGeo(2.42, 0.74, 0.3), M(0xb5352a), 0, -0.45, 0), box(4.3, 0.04, 1.3, 0x6b7680, -0.2, 0.61, 0));
const contColors = [0xe4572e, 0xf2c14e, 0x2b8a6e, 0x2a6f97, 0x7b4fa3, 0xfaf6ea, 0xc0392b];
for (let c = 0; c < 5; c++) for (let r = 0; r < 3; r++) { const n = 1 + Math.floor(rand() * 3); for (let l = 0; l < n; l++) ship.add(box(0.6, 0.32, 0.34, contColors[Math.floor(rand() * contColors.length)], -1.2 + c * 0.64, 0.79 + l * 0.33, -0.38 + r * 0.38)); }
ship.add(box(0.7, 1.25, 1.2, 0xfaf6ea, -2.0, 1.25, 0), box(0.72, 0.16, 1.22, WIN[1], -2.0, 1.6, 0), box(0.9, 0.06, 1.35, 0xfaf6ea, -2.0, 1.9, 0), cyl(0.14, 0.18, 0.6, 8, 0xe4572e, -2.15, 2.2, 0), mesh(new THREE.SphereGeometry(0.05, 6, 4), lampMat, 2.2, 0.75, 0));
const puffs = Array.from({ length: 6 }, () => { const p = noRay(new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), basic(0xffffff, 0.4))); ship.add(p); return p; });
ship.position.set(0, -4, 0); zoneIntl.add(ship);
const SHIP = { rx: 17, rz: 14.5, a: 0.9, w: 0.06 };
const wakes = Array.from({ length: 9 }, () => { const m = noRay(new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 20).rotateX(-Math.PI / 2), basic(0xffffff, 0.4))); scene.add(m); return m; });
const tanker = new THREE.Group();
tanker.add(mesh(hullGeo(3.0, 0.8, 0.8), M(0x4a2f2a), 0, -0.3, 0), mesh(hullGeo(3.02, 0.82, 0.28), M(0x7a1f1f), 0, -0.45, 0), box(5.2, 0.05, 1.4, 0x8a4a3a, -0.3, 0.52, 0));
for (let i = 0; i < 4; i++) tanker.add(mesh(new THREE.SphereGeometry(0.55, 10, 8, 0, TAU, 0, Math.PI / 2), M(0xf2efe6), -1.2 + i * 1.05, 0.52, 0));
tanker.add(box(0.7, 1.1, 1.3, 0xfaf6ea, -2.6, 1.05, 0), box(0.72, 0.14, 1.32, WIN[0], -2.6, 1.35, 0), cyl(0.12, 0.15, 0.5, 8, 0x2f3e4e, -2.75, 1.85, 0));
tanker.position.y = -4; zoneIntl.add(tanker);
const TANK = { rx: 27, rz: 23, a: 3.6, w: -0.028 };
const sails = [[4.5, 10.2, 0xffffff], [-6, -10.5, 0xffe9c2]].map(([x, z, c]) => {
  const g = new THREE.Group(), sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0, 1.5); sh.lineTo(0.75, 0.1); sh.closePath();
  g.add(box(0.95, 0.16, 0.32, 0x9a7b55, 0, 0.05, 0), cyl(0.02, 0.02, 1.7, 5, 0x6b5a45, 0, 0.9, 0), new THREE.Mesh(new THREE.ShapeGeometry(sh), M(c, { side: THREE.DoubleSide })).translateY(0.2).translateX(0.04));
  g.userData = { ph: rand() * 6, c: [x, z] }; g.position.set(x, -4, z); zoneIntl.add(g); return g;
});
const plane = new THREE.Group(); plane.rotation.order = 'YXZ';
plane.add(mesh(new THREE.CapsuleGeometry(0.14, 1.2, 3, 8).rotateZ(Math.PI / 2), M(0xfaf6ea)), box(0.36, 0.04, 1.9, 0xfaf6ea, 0.05, 0, 0), box(0.2, 0.03, 0.7, 0xfaf6ea, -0.62, 0.05, 0), box(0.24, 0.32, 0.03, 0xe4572e, -0.64, 0.2, 0));
zoneIntl.add(plane);
const TRAIL_N = 70, trailPos = new Float32Array(TRAIL_N * 3);
const trail = noRay(new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(trailPos, 3)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })));
trail.frustumCulled = false; scene.add(trail); let trailInit = false;
const currents = new THREE.Group(); zoneIntl.add(currents);
(function () {
  const sh = new THREE.Shape(); sh.moveTo(0.34, 0); sh.lineTo(-0.2, 0.24); sh.lineTo(-0.04, 0); sh.lineTo(-0.2, -0.24); sh.closePath();
  const geo = new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2), m = basic(0xe6f8ff, 0.55);
  [[11.5, 0.2, 18], [14.2, -0.15, 22], [19.5, 0.1, 30]].forEach(([r, sp, n]) => {
    const ring = new THREE.Group(); ring.userData.sp = sp;
    for (let i = 0; i < n; i++) { const a = i / n * TAU, c = noRay(new THREE.Mesh(geo, m)); c.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); c.rotation.y = -(a + Math.sign(sp) * Math.PI / 2); ring.add(c); }
    currents.add(ring);
  });
})();

/* ============================================================
   01 政策氣候：雲、雨、熱氣球、山頂風向站、風力機
   ============================================================ */
curLayer = 'policy';
const zonePolicy = grp('policy'); scene.add(zonePolicy);
const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.28 });
const clouds = Array.from({ length: 8 }, (_, i) => {
  const g = new THREE.Group(), n = 4 + Math.floor(rand() * 3);
  for (let j = 0; j < n; j++) { const s = mesh(new THREE.IcosahedronGeometry(0.75 + rand() * 0.6, 1), cloudMat, (j - n / 2) * 0.95 + rand() * 0.3, rand() * 0.35, (rand() - 0.5) * 0.9); s.scale.y = 0.62; s.castShadow = i < 3; s.receiveShadow = false; g.add(s); }
  g.position.set(-22 + rand() * 44, i === 0 ? 9.2 : 10 + rand() * 4.5, i === 0 ? -1.5 : -18 + rand() * 30);
  g.userData = { sp: 0.22 + rand() * 0.3, s: i === 0 ? 0.95 : 0.65 + rand() * 0.45, ph: rand() * 6 }; g.scale.setScalar(0.001); zonePolicy.add(g); return g;
});
const RAIN_N = 160, rainPos = new Float32Array(RAIN_N * 6), rainSeed = Array.from({ length: RAIN_N }, () => [(rand() - 0.5) * 3.4, (rand() - 0.5) * 2.2, rand()]);
const rain = noRay(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(rainPos, 3)), new THREE.LineBasicMaterial({ color: 0xcfe2ff, transparent: true, opacity: 0 })));
rain.frustumCulled = false; scene.add(rain);

const balloon = new THREE.Group();
(function () {
  let g = new THREE.SphereGeometry(1.05, 14, 10).toNonIndexed(); g.computeVertexNormals();
  const p = g.attributes.position, col = new Float32Array(p.count * 3), c1 = new THREE.Color(0xc9711a), c2 = new THREE.Color(0xfff4de), c3 = new THREE.Color(0xe4572e);
  for (let f = 0; f < p.count; f += 3) { const a = Math.atan2((p.getZ(f) + p.getZ(f + 1) + p.getZ(f + 2)) / 3, (p.getX(f) + p.getX(f + 1) + p.getX(f + 2)) / 3), k = Math.floor((a + Math.PI) / TAU * 14) % 3, c = k === 0 ? c1 : k === 1 ? c2 : c3; for (let v = 0; v < 3; v++) { col[(f + v) * 3] = c.r; col[(f + v) * 3 + 1] = c.g; col[(f + v) * 3 + 2] = c.b; } }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const env = mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.7 })); env.scale.y = 1.15;
  layerMats.policy.add(env.material); env.material.userData.e0 = new THREE.Color(0);
  balloon.add(env, cyl(0.5, 0.2, 0.7, 10, 0xc9711a, 0, -1.3, 0), box(0.36, 0.26, 0.36, 0x9a7b55, 0, -2.15, 0));
  [[-.16, -.16], [.16, -.16], [-.16, .16], [.16, .16]].forEach(([x, z]) => balloon.add(cyl(0.008, 0.008, 0.55, 3, 0x4a443c, x, -1.8, z)));
})();
const flame = noRay(new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 6), basic(0xffb347, 0.9))); flame.position.y = -1.75; balloon.add(flame);
const BALLOON = new THREE.Vector3(-2.2, 8.0, -1.6); balloon.position.copy(BALLOON); balloon.scale.setScalar(0.001); zonePolicy.add(balloon);

const station = grp('policy'), HY = groundY(HILL[0], HILL[1]);
station.add(cyl(0.34, 0.4, 0.3, 8, 0xfaf6ea, 0, 0.15, 0), mesh(new THREE.SphereGeometry(0.3, 10, 6, 0, TAU, 0, Math.PI / 2), M(0xdfe8f0), 0, 0.3, 0), cyl(0.03, 0.04, 1.9, 6, 0x8a8f96, 0.5, 0.95, 0));
const vaneHead = new THREE.Group(); vaneHead.position.set(0.5, 1.95, 0);
vaneHead.add(cone(0.11, 0.36, 6, 0xc9711a, 0.42, 0, 0).rotateZ(-Math.PI / 2), box(0.72, 0.035, 0.035, 0xc9711a, 0, 0, 0), box(0.04, 0.26, 0.2, 0xc9711a, -0.36, 0, 0));
const cups = new THREE.Group(); cups.position.set(0.5, 1.55, 0);
for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; cups.add(box(0.26, 0.02, 0.02, 0x8a8f96, Math.cos(a) * 0.13, 0, Math.sin(a) * 0.13).rotateY(-a), mesh(new THREE.SphereGeometry(0.055, 6, 5), M(0xe4572e), Math.cos(a) * 0.27, 0, Math.sin(a) * 0.27)); }
station.add(vaneHead, cups); station.position.set(HILL[0], HY - 0.02, HILL[1]); island.add(pop(station, 0.9));
const turbines = [[-0.8, 0.2, 0], [0.6, -0.7, 1.1], [0.5, 0.9, 2.3]].map(([x, z, ph]) => {
  const g = grp('policy'); g.add(cyl(0.04, 0.08, 2.4, 6, 0xfaf6ea, 0, 1.2, 0), box(0.2, 0.14, 0.3, 0xfaf6ea, 0, 2.42, 0));
  const bl = new THREE.Group(); bl.position.set(0, 2.42, 0.2); for (let i = 0; i < 3; i++) { const b = box(0.07, 1.0, 0.025, 0xffffff, 0, 0.5, 0), h = new THREE.Group(); h.rotation.z = i / 3 * TAU + ph; h.add(b); bl.add(h); }
  g.add(bl); g.position.set(x, ISLET_TOP, z); g.rotation.y = 0.9; g.userData.bl = bl; isTurb.add(g); return g;
});
curLayer = null;

/* ============================================================
   燈塔（每日觀測）、飛鳥、棕櫚
   ============================================================ */
const lighthouse = new THREE.Group(); lighthouse.userData.href = 'daily.html';
for (let i = 0; i < 5; i++) lighthouse.add(cyl(0.36 - i * 0.04, 0.4 - i * 0.04, 0.5, 10, i % 2 ? 0xe4572e : 0xfaf6ea, 0, 0.25 + i * 0.5, 0));
lighthouse.add(cyl(0.34, 0.34, 0.06, 10, 0x3b4a5a, 0, 2.53, 0), mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.34, 8), new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xffe9a8, emissiveIntensity: 1.6 }), 0, 2.73, 0), cone(0.3, 0.3, 8, 0x3b4a5a, 0, 3.05, 0), box(0.5, 0.4, 0.5, 0xfaf6ea, 0.6, 0.2, 0.2), cone(0.42, 0.25, 4, 0xe4572e, 0.6, 0.52, 0.2).rotateY(Math.PI / 4));
const beam = new THREE.Group(); beam.position.y = 2.73;
const beamMat = basic(0xfff1c0, 0.08, { blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
[1, -1].forEach(s => { const c = noRay(new THREE.Mesh(new THREE.ConeGeometry(0.75, 7, 14, 1, true).rotateZ(s * Math.PI / 2).translate(-s * 3.5, 0, 0), beamMat)); beam.add(c); });
lighthouse.add(beam); lighthouse.position.set(0, ISLET_TOP, 0); isLH.add(lighthouse);
(function palm() { for (let k = 0; k < 2; k++) { const g = new THREE.Group(); g.add(cyl(0.05, 0.08, 1.3, 5, 0x9a7b55, 0, 0.65, 0)); for (let i = 0; i < 6; i++) { const l = cone(0.12, 0.9, 4, 0x4da043, 0, 0, 0); l.rotation.z = Math.PI / 2 + 0.5; const h = new THREE.Group(); h.position.y = 1.3; h.rotation.y = i / 6 * TAU; l.position.x = 0.36; h.add(l); g.add(h); } g.position.set(k ? 0.5 : -0.3, ISLET_TOP, k ? -0.2 : 0.3); g.rotation.z = k ? 0.12 : -0.1; isPalm.add(g); } })();
const birds = Array.from({ length: 9 }, (_, i) => {
  const g = new THREE.Group(); g.rotation.order = 'YXZ'; const m = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, side: THREE.DoubleSide });
  const wing = s => { const h = new THREE.Group(), w = noRay(new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.08, 0, 0), new THREE.Vector3(-0.1, 0, 0), new THREE.Vector3(-0.02, 0, s * 0.42)]), m)); w.geometry.computeVertexNormals(); h.add(w); return h; };
  const l = wing(1), r = wing(-1); g.add(noRay(new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.24, 4).rotateZ(-Math.PI / 2), m)), l, r);
  g.userData = { l, r, off: i * 0.42 + rand() * 0.2, rad: 9 + (i % 3) * 1.3 + rand(), h: 6 + rand() * 2.5, ph: rand() * 6 }; g.scale.setScalar(1.25); scene.add(g); return g;
});

/* 季節粒子：落花、落葉、雪 */
const PART_N = 340, partPos = new Float32Array(PART_N * 3), partSeed = new Float32Array(PART_N);
for (let i = 0; i < PART_N; i++) { const a = rand() * TAU, r = Math.sqrt(rand()) * 15; partPos[i * 3] = Math.cos(a) * r; partPos[i * 3 + 1] = rand() * 12; partPos[i * 3 + 2] = Math.sin(a) * r; partSeed[i] = rand() * 6; }
const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 2, 16, 16, 15); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
const partMat = new THREE.PointsMaterial({ size: 0.13, map: dot, transparent: true, opacity: 0, depthWrite: false, color: 0xffc2d6 });
const parts = noRay(new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(partPos, 3)), partMat)); parts.frustumCulled = false; scene.add(parts);

/* ============================================================
   標示（CSS2D）
   ============================================================ */
const pins = {};
function makePin(text, num, layer, parent, pos, cls = '') {
  const el = document.createElement('div'); el.className = 'pin ' + cls;
  el.innerHTML = num ? `<i class="dot" style="background:${(D.layers.find(l => l.id === layer) || {}).hex || '#e4572e'}"></i>${text}<span class="num">${num}</span>` : text;
  if (layer) { el.onclick = e => { e.stopPropagation(); API.select(layer, true); }; pins[layer] = el; }
  const o = new CSS2DObject(el); o.position.copy(pos); parent.add(o); return el;
}
makePin('政策氣候', '01', 'policy', balloon, new THREE.Vector3(0, 1.45, 0));
makePin('國際海象', '02', 'intl', ship, new THREE.Vector3(-0.4, 2.7, 0));
makePin('市場潮位', '03', 'market', gaugeG, new THREE.Vector3(0, 3.9, 0));
makePin('個別條件', '04', 'ind', tower, new THREE.Vector3(0, 7.1, 0));
makePin('每日觀測', '↗', null, lighthouse, new THREE.Vector3(0, 3.5, 0), 'link').onclick = () => { location.href = 'daily.html'; };
makePin('都更工地', '', null, crane, new THREE.Vector3(0, 5.0, 0), 'small');
makePin('輕軌', '', null, tram[0], new THREE.Vector3(0, 0.8, 0), 'small');
makePin('高壓電塔', '', null, pylon1, new THREE.Vector3(0, 3.6, 0), 'small');
makePin('老公寓', '', null, apt, new THREE.Vector3(0, 3.2, 0), 'small');
makePin('風向站', '', null, station, new THREE.Vector3(0.5, 2.5, 0), 'small');

/* ============================================================
   季節＝市場循環＝一天的光線
   ============================================================ */
const SEASON = {
  spring: { top: 0x86c5f2, hor: 0xfbeedd, sun: 0xfff1dc, sunI: 1.75, dir: [14, 22, 10], hSky: 0xdff1f7, hG: 0x7fae62, hI: 0.95, deep: 0x1f7fa8, shallow: 0x7ed6dc, tint: 0xffffff, lC: 0x3f8f44, lR: 0x6cc05a, lB: 0xf6a9c4, cloud: 0xffffff, glow: 0.1, lamp: 0, stars: 0, night: 0, exp: 1.05, pN: 150, pCol: 0xffc2d6, pSize: 0.13, pFall: 0.45, pSway: 0.9, pOp: 0.85, rain: 0, vane: -0.6 },
  summer: { top: 0x3d96e6, hor: 0xdaf1fb, sun: 0xffffff, sunI: 2.1, dir: [7, 26, 9], hSky: 0xcfeaff, hG: 0x86c05f, hI: 1.0, deep: 0x0c74b6, shallow: 0x4fd8d4, tint: 0xf2ffe4, lC: 0x2f8040, lR: 0x4aa648, lB: 0x58b04e, cloud: 0xffffff, glow: 0.06, lamp: 0, stars: 0, night: 0, exp: 1.0, pN: 0, pCol: 0xffffff, pSize: 0.1, pFall: 0.3, pSway: 0.5, pOp: 0, rain: 0, vane: 0.6 },
  autumn: { top: 0x7586c8, hor: 0xf9c48c, sun: 0xffb468, sunI: 1.6, dir: [22, 8.5, 7], hSky: 0xf6d9b8, hG: 0x9a8a52, hI: 0.8, deep: 0x2a6a8e, shallow: 0x86bdb0, tint: 0xf2e2b0, lC: 0x5d7f3d, lR: 0xdd8a2e, lB: 0xc8482e, cloud: 0xffe6cc, glow: 0.8, lamp: 0.6, stars: 0.15, night: 0.4, exp: 1.05, pN: 190, pCol: 0xe8892e, pSize: 0.16, pFall: 0.7, pSway: 1.6, pOp: 0.9, rain: 1, vane: 2.0 },
  winter: { top: 0x0d1a38, hor: 0x40597e, sun: 0xa8c2ff, sunI: 1.0, dir: [-9, 19, -7], hSky: 0x7f97c8, hG: 0x55647a, hI: 1.05, deep: 0x0f2f4c, shallow: 0x2c627c, tint: 0xc9d8e2, lC: 0x7fa39a, lR: 0xc3d6d2, lB: 0xe6eeee, cloud: 0x9fb2d0, glow: 1.5, lamp: 1.7, stars: 1, night: 1, exp: 1.25, pN: 340, pCol: 0xffffff, pSize: 0.11, pFall: 1.0, pSway: 0.6, pOp: 0.95, rain: 0, vane: 3.4 }
};
const COL_KEYS = ['top', 'hor', 'sun', 'hSky', 'hG', 'deep', 'shallow', 'tint', 'lC', 'lR', 'lB', 'cloud', 'pCol'], NUM_KEYS = ['sunI', 'hI', 'glow', 'lamp', 'stars', 'night', 'exp', 'pSize', 'pFall', 'pSway', 'pOp', 'rain'];
const cur = {}, tgt = {}; let target = SEASON.spring, tideLevel = 0.4, policyGauge = 45, seasonInit = false;
COL_KEYS.forEach(k => { cur[k] = new THREE.Color(SEASON.spring[k]); tgt[k] = new THREE.Color(SEASON.spring[k]); });
NUM_KEYS.forEach(k => cur[k] = SEASON.spring[k]);
cur.dir = new THREE.Vector3(...SEASON.spring.dir).normalize(); tgt.dir = cur.dir.clone(); cur.vane = -0.6; cur.pN = 150;
VI.onSeason((s, data) => {
  target = SEASON[s] || SEASON.spring; tideLevel = data.tide; policyGauge = data.gauges[1];
  COL_KEYS.forEach(k => tgt[k].setHex(target[k])); tgt.dir.set(...target.dir).normalize();
  if (!seasonInit) { seasonInit = true; COL_KEYS.forEach(k => cur[k].copy(tgt[k])); NUM_KEYS.forEach(k => cur[k] = target[k]); cur.dir.copy(tgt.dir); cur.vane = target.vane; seaY = -0.3 + tideLevel * 0.5; }
});

/* ============================================================
   互動：點選、滑過、鏡頭
   ============================================================ */
const VIEW = {
  ind: { pos: [9.5, 7, 11.5], target: [0.4, 1.7, 0.6] },
  market: { pos: [pB[0] + pDir[0] * 9.5 + pDir[1] * 6, 6.2, pB[1] + pDir[1] * 9.5 - pDir[0] * 6], target: [pB[0] - pDir[0] * 0.5, 1.2, pB[1] - pDir[1] * 0.5] },
  intl: { pos: [21, 6.5, 17], target: [9.5, 0.8, 5.5] },
  policy: { pos: [10, 12.5, 13.5], target: [-1.2, 6.4, -2] }
};
const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
function pick(e) {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(scene.children, true)[0];
  if (!hit) return null;
  let o = hit.object;
  while (o) { if (o.userData.person) return { person: o }; if (o.userData.href) return { href: o.userData.href }; if (o.userData.layer) return { layer: o.userData.layer }; o = o.parent; }
  return { none: true };
}
let down = null, hover = null, lastMove = 0;
const allFacts = () => D.facts.concat(KN.facts || []);
renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!down) return; const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]); down = null; if (moved > 6 || tour.on) return;
  const p = pick(e); if (!p) return;
  if (p.person) { const f = allFacts(); VI.toast('🙂 ' + f[Math.floor(Math.random() * f.length)], 3400); p.person.userData.jump = 1; }
  else if (p.href) location.href = p.href;
  else if (p.layer) API.select(p.layer, true);
  else API.select(null);
});
renderer.domElement.addEventListener('pointermove', e => {
  const now = performance.now(); if (now - lastMove < 70 || down) return; lastMove = now;
  const p = pick(e); hover = p && p.layer ? p.layer : null;
  renderer.domElement.style.cursor = p && (p.layer || p.person || p.href) ? 'pointer' : 'grab';
});
renderer.domElement.addEventListener('pointerleave', () => { hover = null; });

let active = null, flewTo = false;
const API = window.ISLAND = {
  select(layer, openDrawer = false) {
    active = active === layer ? null : layer;
    Object.entries(pins).forEach(([k, el]) => el.classList.toggle('active', k === active));
    document.dispatchEvent(new CustomEvent('island:select', { detail: { layer: active } }));
    if (!tour.on && introDone) { if (active && VIEW[active]) { flyTo(VIEW[active].pos, VIEW[active].target, 1.6); flewTo = true; } else if (flewTo) { API.home(); flewTo = false; } }
    if (openDrawer && active) VI.openDrawer(active);
  },
  highlight(layer) { active = layer; Object.entries(pins).forEach(([k, el]) => el.classList.toggle('active', k === active)); },
  labels(on) { labelWrap.classList.toggle('hidden', !on); },
  currents(on) { currents.visible = on; },
  pause(on) { paused = on; controls.autoRotate = !on && !tour.on && !reduceMotion; },
  bird() { flyTo([0.01, 40, 0.01], [0, 0, 0], 1.8); },
  home() { flyTo(HOME.toArray(), CENTER.toArray(), 1.8); },
  startTour() { if (!introDone) return; tour.on = true; tour.i = -1; controls.autoRotate = false; controls.enabled = false; nextStop(); tourEl.classList.add('on'); },
  stopTour() { tour.on = false; controls.enabled = true; controls.autoRotate = !paused && !reduceMotion; tourEl.classList.remove('on'); API.highlight(null); API.home(); },
  tourNext() { nextStop(); },
  tourPrev() { tour.i = Math.max(-1, tour.i - 2); nextStop(); }
};
const fly = { on: false, t: 0, dur: 2, p0: new THREE.Vector3(), p1: new THREE.Vector3(), t0: new THREE.Vector3(), t1: new THREE.Vector3() };
function flyTo(pos, tg, dur = 2.2) { fly.on = true; fly.t = 0; fly.dur = dur; fly.p0.copy(camera.position); fly.p1.set(...pos); fly.t0.copy(controls.target); fly.t1.set(...tg); }
const tour = { on: false, i: -1, t: 0 };
function nextStop() {
  tour.i++; if (tour.i >= D.tour.length) { API.stopTour(); return; }
  const s = D.tour[tour.i], v = s.layer && VIEW[s.layer]; tour.t = 0;
  flyTo(v ? v.pos : (tour.i === 0 ? [24, 15, 27] : HOME.toArray()), v ? v.target : CENTER.toArray(), 2.6);
  API.highlight(s.layer);
  tourEl.querySelector('.kicker').textContent = `估價師帶路 ${tour.i + 1} / ${D.tour.length}`;
  tourEl.querySelector('h4').textContent = s.title; tourEl.querySelector('p').textContent = s.text;
}

/* ============================================================
   動畫迴圈
   ============================================================ */
let paused = false, rise = 0, introDone = false, loaded = false, popStart = -1, popsDone = false, T = 0, RT = 0, shoreCache = [999, 1];
const clock = new THREE.Clock(), layerCol = {}, hl = { policy: 0, intl: 0, market: 0, ind: 0 };
D.layers.forEach(l => layerCol[l.id] = new THREE.Color(l.hex));
const ell = (o, a) => [Math.cos(a) * o.rx, Math.sin(a) * o.rz];
function sail(obj, o, bob) { const [x, z] = ell(o, o.a), [x2, z2] = ell(o, o.a + 0.01 * Math.sign(o.w)); obj.position.set(x, seaY + bob, z); obj.rotation.y = -Math.atan2(z2 - z, x2 - x); }

/* 影格率太低時自動降畫質：先降解析度，再關陰影 */
const perf = { n: 0, sum: 0, level: 0 };
function adapt(raw) {
  if (perf.level >= 2 || document.hidden || raw > 0.5) return;
  perf.n++; perf.sum += raw;
  if (perf.n < 50) return;
  const avg = perf.sum / perf.n; perf.n = 0; perf.sum = 0;
  if (avg > 0.036) {
    perf.level++;
    if (perf.level === 1) { renderer.setPixelRatio(1); resize(); }
    else { sun.castShadow = false; lampLights.forEach(l => l.visible = false); renderer.setPixelRatio(Math.min(1, window.devicePixelRatio * 0.8)); resize(); }
  }
}

function animate() {
  requestAnimationFrame(animate);
  const raw = clock.getDelta(), rdt = Math.min(raw, 0.1), dt = paused ? 0 : rdt; T += dt; RT += rdt; adapt(raw);
  const k = 1 - Math.exp(-rdt * 1.8);

  /* 開場：島從海裡浮上來，鏡頭推近 */
  if (rise < 1) {
    rise = Math.min(1, rise + Math.min(raw, 0.25) / 2.8); const e = easeOut(rise);
    island.position.y = lerp(-9, 0, e); island.rotation.y = lerp(-0.5, 0, e);
    camera.position.lerpVectors(INTRO, HOME, easeInOut(rise));
    if (rise > 0.35 && !loaded) { loaded = true; loader.classList.add('off'); }
    if (rise === 1) { introDone = true; controls.enabled = true; wires.visible = true; popStart = RT; }
  }
  islets.forEach(g => { g.position.y = lerp(-7, 0, easeOut(clamp((rise - g.userData.rise * 0.6) / 0.6))); });
  if (introDone && !popsDone) {
    const pt = RT - popStart; let all = true;
    pops.forEach(o => { const u = clamp((pt - o.userData.pop.delay) / 0.65), s = o.userData.pop.s, e = Math.max(0.0001, easeBack(u)); o.scale.set(s.x * e, s.y * e, s.z * e); if (u < 1) all = false; });
    if (all && pt > 3) popsDone = true;
  }
  updateTrees(T, introDone ? RT - popStart : -1);

  /* 季節漸變 */
  COL_KEYS.forEach(c => cur[c].lerp(tgt[c], k)); NUM_KEYS.forEach(n => cur[n] = lerp(cur[n], target[n], k));
  cur.dir.lerp(tgt.dir, k).normalize(); cur.vane = lerp(cur.vane, target.vane, k * 0.8); cur.pN = lerp(cur.pN, target.pN, k);
  hemi.color.copy(cur.hSky); hemi.groundColor.copy(cur.hG); hemi.intensity = cur.hI;
  sun.color.copy(cur.sun); sun.intensity = cur.sunI; sun.position.copy(cur.dir).multiplyScalar(50);
  fill.intensity = 0.3 * (1 - cur.night * 0.6);
  scene.fog.color.copy(cur.hor); renderer.toneMappingExposure = cur.exp;
  skyU.uTop.value.copy(cur.top); skyU.uHor.value.copy(cur.hor); skyU.uSunDir.value.copy(cur.dir); skyU.uSunCol.value.copy(cur.sun); skyU.uStars.value = cur.stars; skyU.uTime.value = RT;
  waterU.uTime.value = T; waterU.uDeep.value.copy(cur.deep); waterU.uShallow.value.copy(cur.shallow); waterU.uSky.value.copy(cur.hor); waterU.uSunDir.value.copy(cur.dir); waterU.uSunCol.value.copy(cur.sun).multiplyScalar(cur.sunI * 0.5); waterU.uFogCol.value.copy(cur.hor); waterU.uFoamAmt.value = smooth(0.75, 1, rise);
  terrainMat.color.copy(cur.tint); leafC.color.copy(cur.lC); leafR.color.copy(cur.lR); leafB.color.copy(cur.lB); cloudMat.color.copy(cur.cloud); cloudMat.emissive.copy(cur.cloud); cloudMat.emissiveIntensity = 0.3 - cur.night * 0.12;
  WIN.forEach(m => m.emissiveIntensity = cur.glow * m.userData.k);
  lampMat.emissiveIntensity = 0.15 + cur.lamp * 2.2; lampLights.forEach(l => l.intensity = cur.lamp * 7);
  beamMat.opacity = 0.025 + cur.night * 0.2;
  blinkMat.emissiveIntensity = Math.sin(RT * 3) > 0.5 ? 2.6 : 0.15;

  /* 潮位：海平面真的會升降 */
  seaY = lerp(seaY, -0.3 + tideLevel * 0.5, k * 0.5); water.position.y = seaY;
  if (Math.abs(shoreCache[0] - seaY) > 0.002) shoreCache = [seaY, shoreT(seaY)];
  waterU.uShoreT.value = shoreCache[1];
  tideFill.scale.y = lerp(tideFill.scale.y, 0.2 + tideLevel * 0.85, k * 0.6); tideFloat.position.y = 0.36 + 2.9 * tideFill.scale.y + 0.1 + Math.sin(T * 2) * 0.03;
  const seaRise = easeOut(clamp(rise * 1.3));
  foams.forEach(f => { const s = 1 + Math.sin(T * 1.4 + f.userData.ph) * 0.06; f.position.y = seaY + 0.04; f.scale.set(s, 1, s); f.material.opacity = (0.3 + Math.sin(T * 1.4 + f.userData.ph) * 0.14) * seaRise; });
  buoys.forEach(b => { b.position.y = lerp(-4, seaY + 0.05 + Math.sin(T * 1.6 + b.userData.ph) * 0.12, seaRise); b.rotation.z = Math.sin(T * 1.2 + b.userData.ph) * 0.14; b.rotation.x = Math.cos(T * 1.0 + b.userData.ph) * 0.1; });
  boats.forEach(b => { b.position.y = lerp(-4, seaY + Math.sin(T * 1.3 + b.userData.ph) * 0.07, seaRise); b.rotation.z = Math.sin(T * 1.1 + b.userData.ph) * 0.06; });
  fishes.forEach(f => {
    const u = f.userData;
    if (u.u < 0) { u.next -= dt; if (u.next <= 0) { const b = buoys[Math.floor(Math.random() * buoys.length)].position; u.base = [b.x + (Math.random() - 0.5) * 3, b.z + (Math.random() - 0.5) * 3]; u.ang = Math.random() * TAU; u.u = 0; f.visible = true; } return; }
    u.u += dt / 1.1; if (u.u >= 1) { u.u = -1; u.next = 5 + Math.random() * 8; f.visible = false; return; }
    f.position.set(u.base[0] + Math.cos(u.ang) * u.u * 1.7, seaY - 0.15 + Math.sin(u.u * Math.PI) * 1.15, u.base[1] + Math.sin(u.ang) * u.u * 1.7); f.rotation.set(0, -u.ang, (0.5 - u.u) * 2.4);
  });

  /* 國際海象 */
  SHIP.a += SHIP.w * dt; TANK.a += TANK.w * dt;
  sail(ship, SHIP, lerp(-4, Math.sin(T * 1.2) * 0.06, seaRise)); ship.rotation.z = Math.sin(T * 0.9) * 0.025;
  sail(tanker, TANK, lerp(-4, Math.sin(T * 1.0 + 2) * 0.05, seaRise));
  puffs.forEach((p, i) => { const a = (T * 0.4 + i / 6) % 1; p.position.set(-2.15 - a * 1.3, 2.55 + a * 1.5, Math.sin(i * 2.1) * a * 0.3); p.scale.setScalar(0.5 + a * 1.6); p.material.opacity = (1 - a) * 0.45; });
  wakes.forEach((w, i) => { const a = (T * 0.33 + i / 9) % 1, [x, z] = ell(SHIP, SHIP.a - SHIP.w * (a * 3.0) - 0.15 * Math.sign(SHIP.w)); w.position.set(x, seaY + 0.05, z); const s = 0.9 + a * 2.6; w.scale.set(s, 1, s); w.material.opacity = (1 - a) * 0.4 * seaRise; });
  sails.forEach(s => { const u = s.userData; s.position.set(u.c[0] + Math.cos(T * 0.12 + u.ph) * 1.1, lerp(-4, seaY + 0.05 + Math.sin(T * 1.4 + u.ph) * 0.06, seaRise), u.c[1] + Math.sin(T * 0.12 + u.ph) * 1.1); s.rotation.y = -(T * 0.12 + u.ph + Math.PI / 2); s.rotation.z = Math.sin(T * 1.1 + u.ph) * 0.09; });
  currents.position.y = seaY + 0.06; currents.children.forEach(r => r.rotation.y += r.userData.sp * dt);
  { const a = T * 0.11 + 1.2, px = Math.cos(a) * 23, pz = Math.sin(a) * 23, py = 12.5 + Math.sin(T * 0.3) * 0.6; plane.position.set(px, py, pz); plane.rotation.y = -(a + Math.PI / 2); plane.rotation.x = 0.3;
    if (!trailInit) { for (let i = 0; i < TRAIL_N; i++) trailPos.set([px, py, pz], i * 3); trailInit = true; }
    if (dt > 0) { trailPos.copyWithin(3, 0, (TRAIL_N - 1) * 3); trailPos.set([px - Math.cos(a + Math.PI / 2) * 0.8, py, pz - Math.sin(a + Math.PI / 2) * 0.8], 0); trail.geometry.attributes.position.needsUpdate = true; } }

  /* 政策氣候 */
  clouds.forEach((c, i) => { const s = c.userData.s; c.scale.setScalar(lerp(c.scale.x, rise > 0.3 ? s : 0.001, 0.04)); c.position.x += c.userData.sp * dt; if (c.position.x > 24) c.position.x = -24; c.position.y += Math.sin(T * 0.4 + c.userData.ph) * 0.0015; });
  rain.material.opacity = lerp(rain.material.opacity, cur.rain > 0.5 && introDone ? 0.6 : 0, k);
  if (rain.material.opacity > 0.02) { const c = clouds[0].position; for (let i = 0; i < RAIN_N; i++) { const s = rainSeed[i], y = c.y - 0.3 - ((T * 5.5 + s[2] * 8) % 7.2), x = c.x + s[0] - (c.y - y) * 0.06, z = c.z + s[1]; rainPos.set([x, y, z, x - 0.02, y - 0.3, z], i * 6); } rain.geometry.attributes.position.needsUpdate = true; }
  balloon.scale.setScalar(lerp(balloon.scale.x, rise > 0.5 ? 1 : 0.001, 0.05));
  balloon.position.set(BALLOON.x + Math.sin(T * 0.21) * 1.3, BALLOON.y + Math.sin(T * 0.6) * 0.3, BALLOON.z + Math.cos(T * 0.17) * 1.0); balloon.rotation.y = Math.sin(T * 0.15) * 0.5;
  flame.scale.y = 0.8 + Math.sin(RT * 14) * 0.25 + Math.sin(RT * 23) * 0.15;
  vaneHead.rotation.y = cur.vane + Math.sin(T * 0.9) * 0.12; cups.rotation.y += dt * (2 + policyGauge / 14);
  turbines.forEach(t => t.userData.bl.rotation.z -= dt * (0.7 + policyGauge / 35));
  beam.rotation.y += dt * 0.55;

  /* 個別條件：輕軌、車、人、工地 */
  if (tramStop > 0) tramStop -= dt; else { tramA += dt * 0.13; tramCool -= dt; const am = ((tramA % TAU) + TAU) % TAU; if (Math.abs(am - STA) < 0.012 && tramCool <= 0) { tramStop = 2.6; tramCool = 12; } }
  tram.forEach((c, i) => { const p = tramPose(tramA - i * 0.125); c.position.set(p.x, p.y, p.z); c.rotation.y = p.rot; });
  cars.forEach(c => { const u = c.userData; u.s += u.dir * u.sp * dt; if (Math.abs(u.s) > RL - 0.3) { u.dir *= -1; u.s = Math.sign(u.s) * (RL - 0.3); } const [x, z] = roadPt(u.s, -u.dir * 0.27); c.position.set(x, TOP + 0.03, z); c.rotation.y = -RANG + (u.dir < 0 ? Math.PI : 0); });
  people.forEach(g => {
    const u = g.userData; if (u.jump > 0) u.jump = Math.max(0, u.jump - dt * 2.2);
    const hop = Math.sin(u.jump * Math.PI) * 0.6;
    if (u.wait > 0) { u.wait -= dt; g.children[0].position.y = 0.27 + hop; g.children[1].position.y = 0.6 + hop; return; }
    let x, z, hx, hz;
    if (u.onRoad) { u.s += u.dir * u.sp * 0.6 * dt; if (Math.abs(u.s) > RL - 0.5) u.dir *= -1; [x, z] = roadPt(u.s, u.side); hx = RU[0] * u.dir; hz = RU[1] * u.dir; }
    else { u.a += u.dir * u.sp * 0.085 * dt; [x, z] = P(WALK_T, u.a); const [x2, z2] = P(WALK_T, u.a + 0.01 * u.dir); hx = x2 - x; hz = z2 - z; }
    const bob = Math.abs(Math.sin(T * 8 + u.ph)) * 0.035 + hop;
    g.position.set(x, groundY(x, z), z); g.rotation.y = Math.atan2(hx, hz); g.children[0].position.y = 0.27 + bob; g.children[1].position.y = 0.6 + bob;
    if (Math.random() < dt * 0.05) u.wait = 1 + Math.random() * 3;
  });
  craneArm.rotation.y = Math.sin(T * 0.22) * 1.9 + 0.6;
  { const h = 1.4 + Math.sin(T * 0.5) * 1.1; hookLine.scale.y = h; hookLine.position.y = -h / 2; hookLoad.position.y = -h - 0.1; }
  { const lv = Math.floor((T * 0.16) % 9); slabs.forEach((s, i) => s.visible = i < Math.min(6, lv)); }

  /* 飛鳥 */
  birds.forEach(b => { const u = b.userData, a = T * 0.2 + u.off; b.position.set(Math.cos(a) * u.rad + 1, u.h + Math.sin(T * 0.7 + u.ph) * 0.5, Math.sin(a) * u.rad); b.rotation.y = -(a + Math.PI / 2); b.rotation.x = 0.25; const f = Math.sin(T * 9 + u.ph) * 0.6; u.l.rotation.x = -f; u.r.rotation.x = f; });

  /* 季節粒子 */
  partMat.opacity = lerp(partMat.opacity, target.pOp * (introDone ? 1 : 0), k); partMat.size = cur.pSize; partMat.color.copy(cur.pCol);
  parts.geometry.setDrawRange(0, Math.round(cur.pN));
  if (partMat.opacity > 0.02 && dt > 0) { for (let i = 0; i < PART_N; i++) { const j = i * 3; partPos[j + 1] -= cur.pFall * (0.7 + (partSeed[i] % 1) * 0.6) * dt; partPos[j] += (Math.sin(T * cur.pSway + partSeed[i]) * 0.5 + 0.25) * dt; partPos[j + 2] += Math.cos(T * cur.pSway * 0.8 + partSeed[i]) * 0.4 * dt; if (partPos[j + 1] < 0.1) { partPos[j + 1] = 11 + Math.random() * 2; const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 15; partPos[j] = Math.cos(a) * r; partPos[j + 2] = Math.sin(a) * r; } } parts.geometry.attributes.position.needsUpdate = true; }

  /* 選取與滑過的高亮 */
  for (const L in layerMats) {
    const want = (L === active ? 0.55 + Math.sin(RT * 4) * 0.2 : 0) + (L === hover && L !== active ? 0.28 : 0);
    if (want === 0 && hl[L] < 0.004) { if (hl[L] !== 0) { hl[L] = 0; layerMats[L].forEach(m => m.emissive.copy(m.userData.e0)); } continue; }
    hl[L] = lerp(hl[L], want, 0.18); layerMats[L].forEach(m => m.emissive.copy(m.userData.e0).lerp(layerCol[L], hl[L] * 0.55));
  }

  /* 鏡頭 */
  if (fly.on) { fly.t = Math.min(1, fly.t + rdt / fly.dur); const e = easeInOut(fly.t); camera.position.lerpVectors(fly.p0, fly.p1, e); controls.target.lerpVectors(fly.t0, fly.t1, e); if (fly.t === 1) fly.on = false; }
  if (tour.on) { const s = D.tour[tour.i]; tour.t += rdt; tourEl.querySelector('.bar i').style.width = Math.min(100, tour.t / s.dur * 100) + '%'; if (tour.t >= s.dur) nextStop(); }
  controls.update();
  renderer.render(scene, camera); labelRenderer.render(scene, camera);
}

function resize() { const w = wrap.clientWidth, h = wrap.clientHeight; if (!w || !h) return; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); labelRenderer.setSize(w, h); }
new ResizeObserver(resize).observe(wrap); resize();
setProgress(70);
requestAnimationFrame(() => { setProgress(100); animate(); });
