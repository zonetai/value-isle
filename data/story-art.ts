/* 價值島 — 故事書的插圖（全部手寫 SVG，畫在 320×220 的框裡）
   線條統一用墨色 #2a2520、圓角；底下那顆淡淡的圓用 var(--sb-tint)，跟著角色所屬的那一層變色。 */

const INK = "#2a2520";
const C = { paper: "#fffaf0", cream: "#f6ead2", peach: "#f2c9a8", orange: "#e4572e", yellow: "#f2c14e", teal: "#2b8a6e", blue: "#2a6f97", sky: "#cfe3ef", purple: "#7b4fa3", grey: "#c9ccd0", brown: "#9a7b55", green: "#8ccb6e", dark: "#3b4a5a", pink: "#f4a7a0" };
const wrap = (inner: string) =>
  `<svg viewBox="0 0 320 220" aria-hidden="true"><ellipse cx="160" cy="118" rx="118" ry="92" fill="var(--sb-tint)"/><path d="M40 196H280" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity=".35"/><g stroke="${INK}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">${inner}</g></svg>`;
const r = (x: number, y: number, w: number, h: number, f: string, rx = 4) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}"/>`;
const c = (x: number, y: number, rr: number, f: string) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="${f}"/>`;
const p = (d: string, f = "none") => `<path d="${d}" fill="${f}"/>`;
const lines = (x: number, y: number, w: number, n: number, gap: number) => p(Array.from({ length: n }, (_, i) => `M${x} ${y + i * gap}h${w * (i % 3 === 2 ? 0.6 : 1)}`).join(""));
const house = (x: number, y: number, w: number, h: number, wall: string, roof: string) =>
  r(x, y, w, h, wall, 2) + p(`M${x - 6} ${y + 2}L${x + w / 2} ${y - h * 0.45}L${x + w + 6} ${y + 2}Z`, roof) + r(x + w * 0.4, y + h * 0.55, w * 0.2, h * 0.45, C.brown, 1) + r(x + w * 0.12, y + h * 0.2, w * 0.2, h * 0.2, C.sky, 1) + r(x + w * 0.68, y + h * 0.2, w * 0.2, h * 0.2, C.sky, 1);
const coin = (x: number, y: number, n = 1) => Array.from({ length: n }, (_, i) => `<ellipse cx="${x}" cy="${y - i * 7}" rx="16" ry="6" fill="${C.yellow}"/>`).join("");
const bean = (x: number, y: number, body: string, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-16" y="-34" width="32" height="44" rx="16" fill="${body}"/><circle cx="0" cy="-48" r="15" fill="#f5d2b8"/><circle cx="-5" cy="-49" r="1.6" fill="${INK}" stroke="none"/><circle cx="5" cy="-49" r="1.6" fill="${INK}" stroke="none"/><path d="M-4 -42q4 3 8 0" fill="none"/></g>`;

export const ART: Record<string, string> = {
  calendar: wrap(r(78, 46, 164, 140, C.paper, 8) + r(78, 46, 164, 28, C.orange, 8) + r(78, 62, 164, 12, C.orange, 0) + c(110, 46, 5, C.cream) + c(210, 46, 5, C.cream)
    + p("M78 104H242M78 134H242M78 164H242M119 74V186M160 74V186M201 74V186")
    + house(126, 116, 26, 14, C.peach, C.orange) + house(208, 146, 26, 14, C.sky, C.blue) + `<circle cx="180" cy="119" r="14" fill="none" stroke="${C.orange}" stroke-width="3"/>`
    + p("M250 70L274 150L266 154L246 74Z", C.yellow) + p("M266 154l-6 10l-2-12", C.dark)),
  calc: wrap(p("M176 60L264 52L272 170L184 178Z", C.paper) + lines(192, 76, 60, 7, 13) + r(66, 54, 104, 140, C.dark, 12) + r(78, 66, 80, 28, "#e9f1d8", 4)
    + Array.from({ length: 12 }, (_, i) => c(92 + (i % 3) * 26, 112 + Math.floor(i / 3) * 20, 7, i === 11 ? C.orange : C.cream)).join("") + coin(232, 190, 4) + coin(268, 192, 2)),
  twohouses: wrap(house(62, 108, 82, 86, C.peach, C.orange) + house(178, 100, 82, 94, C.sky, C.blue) + p("M150 70v14M118 62h-12M206 54v14")
    + p("M100 58l26-14l20 0l0 18l-20 0z", C.yellow) + p("M214 48l26-14l24 0l0 18l-24 0z", C.teal) + c(132, 53, 3, C.paper) + c(248, 43, 3, C.paper)
    + p("M220 128h22M220 146h22M220 164h22", "none")),
  bank: wrap(p("M70 92L160 44L250 92Z", C.cream) + c(160, 74, 12, C.yellow) + r(70, 92, 180, 12, C.cream, 2)
    + [92, 128, 164, 200].map(x => r(x, 104, 22, 70, C.paper, 2)).join("") + r(62, 174, 196, 10, C.cream, 2) + r(54, 184, 212, 10, C.cream, 2) + p("M156 74h8M160 68v12", "none")),
  phone: wrap(r(108, 30, 104, 172, C.dark, 16) + r(116, 46, 88, 136, C.paper, 6) + r(124, 56, 52, 18, C.sky, 9) + r(144, 82, 52, 18, C.peach, 9) + r(124, 108, 60, 18, C.sky, 9) + r(140, 134, 56, 18, C.peach, 9)
    + c(212, 40, 9, C.orange) + p("M150 190h20") + p("M232 90q16 10 0 24M246 80q26 22 0 44", "none")),
  memory: wrap(`<g transform="rotate(-6 130 120)">${r(70, 56, 120, 110, C.paper, 4)}${r(82, 68, 96, 74, C.sky, 2)}${house(110, 102, 40, 38, C.peach, C.orange)}</g>`
    + c(232, 76, 34, C.paper) + c(196, 118, 8, C.paper) + c(184, 136, 5, C.paper) + p("M216 70l20-12l14 0l0 16l-14 0z", C.yellow) + p("M222 92q10 8 20 0", "none") + p("M120 182q-6-10 4-12q6-2 6 6q0-8 6-6q10 2 4 12l-10 8z", C.orange)),
  chart: wrap(p("M70 186V48M70 186H262") + [[92, 120], [124, 96], [156, 132], [188, 84], [220, 104]].map(([x, h]) => r(x, 186 - h, 22, h, x === 188 ? C.orange : C.cream, 2)).join("")
    + p("M82 140L122 112L160 128L198 90L236 104L254 78", "none") + [[82, 140], [122, 112], [160, 128], [198, 90], [236, 104]].map(([x, y]) => c(x, y, 4, C.paper)).join("") + c(254, 78, 6, C.orange)),
  deal: wrap(r(56, 56, 120, 62, C.sky, 26) + p("M84 114l-8 22l26-18", C.sky) + r(144, 96, 120, 62, C.peach, 26) + p("M236 154l8 22l-26-18", C.peach)
    + c(160, 106, 22, C.paper) + p("M150 106l7 8l14-16", "none") + house(146, 34, 28, 18, C.cream, C.orange)),
  stairs: wrap(p("M60 190h40v-26h36v-26h36v-26h36v-26h36v-26h20V190Z", C.cream) + p("M100 164h36M136 138h36M172 112h36M208 86h36", "none")
    + bean(152, 136, C.purple, 0.82) + r(168, 108, 18, 22, C.yellow, 3) + p("M170 108q7-10 14 0", "none") + p("M120 118q-4-6 0-12M128 114q-4-6 0-12", "none")),
  flyer: wrap(r(144, 112, 12, 84, C.grey, 2) + p("M96 120V92q0-30 54-30q54 0 54 30v28Z", C.blue) + r(96, 112, 108, 16, C.blue, 2) + r(204, 70, 6, 34, C.orange, 1) + p("M210 70h22v12h-22", C.orange)
    + `<g transform="rotate(-10 150 70)">${r(118, 40, 70, 56, C.paper, 3)}${p("M138 86V56M132 56h26M158 56v12M150 68h14v10h-14z", "none")}</g>`),
  roof: wrap(r(70, 112, 180, 84, C.cream, 2) + lines(82, 132, 156, 4, 16) + r(96, 72, 88, 40, C.teal, 2) + p("M90 74h100M96 84h88M96 94h88M96 104h88", "none")
    + r(206, 82, 26, 30, C.grey, 3) + p("M206 82q13-10 26 0", "none") + `<rect x="86" y="62" width="108" height="56" rx="6" fill="none" stroke="${C.orange}" stroke-dasharray="7 6" stroke-width="2.6"/>` + c(196, 58, 12, C.orange) + p("M190 52l12 12M202 52l-12 12", "none")),
  scale: wrap(p("M160 60V184M130 186h60M88 84H232") + c(160, 58, 7, C.yellow) + p("M88 84l-24 48h48zM232 84l-24 48h48z", "none") + p("M64 132q24 16 48 0", C.cream) + p("M208 132q24 16 48 0", C.cream)
    + house(74, 112, 28, 18, C.peach, C.orange) + coin(232, 128, 3)),
  model: wrap(r(198, 46, 70, 80, C.sky, 4) + p("M233 46v80M198 86h70") + p("M196 128L150 196M270 128L294 196", "none") + r(60, 132, 120, 40, C.orange, 12) + r(70, 118, 100, 22, C.peach, 10) + r(64, 172, 10, 14, C.brown, 2) + r(166, 172, 10, 14, C.brown, 2)
    + p("M206 132v52M192 186h28") + p("M190 132q16-32 32 0z", C.yellow) + r(104, 150, 0, 0, C.paper)),
  future: wrap(`<rect x="170" y="50" width="70" height="140" rx="2" fill="none" stroke-dasharray="7 6"/>` + p("M176 76h58M176 102h58M176 128h58M176 154h58", "none") + c(104, 104, 46, C.paper) + p("M104 104V76M104 104l20 12", "none") + c(104, 104, 4, C.orange) + p("M150 104q12-6 16 0", "none") + p("M158 98l8 6l-8 6", "none")),
  plan: wrap(r(64, 46, 192, 140, "#d9e7f2", 4) + `<g stroke="${C.blue}" stroke-width="2.4">${p("M76 58h168v116H76ZM160 58v70M76 128h120M196 128v46")}</g>`
    + `<rect x="196" y="128" width="48" height="46" fill="${C.orange}" opacity=".35" stroke="none"/>` + p("M200 136l36 32M212 132l32 30M200 152l20 18", "none") + r(92, 74, 30, 20, C.peach, 2) + r(176, 76, 52, 28, C.cream, 2)),
  crane: wrap(p("M98 196V40M86 40h170M98 56l-14-16M98 56l18-16") + r(70, 34, 26, 16, C.dark, 2) + p("M226 40v44", "none") + r(216, 84, 20, 14, C.brown, 2)
    + [0, 1, 2, 3].map(i => r(146, 172 - i * 26, 84, 24, i === 3 ? C.cream : C.grey, 1)).join("") + `<rect x="146" y="70" width="84" height="22" fill="none" stroke-dasharray="6 5"/>` + c(266, 66, 14, C.yellow)),
  letter: wrap(r(70, 82, 160, 104, C.cream, 6) + p("M70 86l80 54l80-54", "none") + `<g transform="rotate(-8 170 80)">${r(116, 40, 108, 76, C.paper, 3)}${lines(130, 58, 76, 4, 12)}</g>` + c(212, 150, 16, C.orange) + p("M205 150h14M212 143v14", "none") + p("M244 70l30 80l-8 4l-30-80z", C.dark)),
  inspect: wrap(r(64, 60, 104, 132, C.brown, 8) + r(74, 74, 84, 110, C.paper, 3) + r(98, 52, 36, 16, C.grey, 4)
    + [88, 112, 136, 160].map((y, i) => p(`M84 ${y}l5 5l9-10`, "none") + p(`M108 ${y}h38`, "none")).join("")
    + p("M196 64l18 30l-10 20l16 26", "none") + c(232, 130, 30, C.sky) + `<circle cx="232" cy="130" r="30" fill="none" stroke-width="5"/>` + p("M254 152l24 24", "none")),
  report: wrap(`<g transform="rotate(5 160 120)">${r(96, 44, 128, 148, C.cream, 4)}</g>` + r(88, 40, 128, 148, C.paper, 4) + lines(104, 64, 96, 6, 14) + p("M104 162h60", "none")
    + `<circle cx="186" cy="160" r="20" fill="none" stroke="${C.orange}" stroke-width="3.4"/><circle cx="186" cy="160" r="14" fill="none" stroke="${C.orange}" stroke-width="1.6"/>` + p("M232 96l26 70l-6 4l-26-70z", C.dark) + p("M252 170l-2 10", "none")),
  form: wrap(r(84, 40, 152, 152, C.paper, 6) + lines(100, 60, 120, 2, 12) + r(100, 92, 120, 24, C.yellow, 4) + r(100, 128, 120, 24, C.sky, 4) + p("M110 104h40M110 140h56", "none") + lines(100, 168, 90, 2, 10) + p("M232 120l34 60l-8 4l-34-60z", C.orange)),
  policy: wrap(c(110, 74, 24, C.paper) + c(140, 64, 30, C.paper) + c(172, 76, 22, C.paper) + r(92, 74, 100, 22, C.paper, 11) + p("M200 66q26-6 40 8M206 84q30 0 44 16M196 100q24 10 30 26", "none")
    + house(70, 156, 44, 36, C.peach, C.orange) + house(130, 150, 44, 42, C.sky, C.blue) + house(190, 158, 40, 34, C.cream, C.teal)),
  magnify: wrap(house(96, 116, 76, 72, C.peach, C.orange) + c(206, 104, 44, "rgba(207,227,239,.55)") + `<circle cx="206" cy="104" r="44" fill="none" stroke-width="6"/>` + p("M238 136l34 34", "none") + p("M198 92q0-12 10-12t10 10q0 8-10 12v8M208 120v2", "none")),
  ledger: wrap(p("M60 70q50-14 100 0v116q-50-14-100 0Z", C.paper) + p("M160 70q50-14 100 0v116q-50-14-100 0Z", C.paper) + lines(74, 92, 70, 5, 16) + lines(174, 92, 70, 5, 16) + p("M160 70v116", "none")
    + coin(248, 196, 3) + r(206, 30, 50, 44, C.paper, 4) + r(206, 30, 50, 12, C.orange, 4) + p("M236 50h-10l-1 8q9-3 11 3q1 7-7 8h-4", "none")),
  empty: wrap(r(60, 46, 200, 150, C.cream, 2) + r(132, 62, 66, 72, C.sky, 2) + p("M165 62v72M132 98h66") + `<polygon points="132,134 198,134 220,196 120,196" fill="${C.yellow}" opacity=".45" stroke="none"/>` + r(148, 74, 34, 22, C.paper, 2) + p("M156 85h18", "none") + p("M86 186q8-6 14 0M226 180q6-4 12 0", "none")),
  social: wrap(r(70, 70, 72, 122, C.paper, 2) + r(70, 64, 72, 8, C.orange, 2) + r(160, 92, 72, 100, C.cream, 2) + r(160, 86, 72, 8, C.orange, 2)
    + [0, 1, 2, 3, 4].map(i => r(80, 84 + i * 20, 52, 10, C.sky, 1)).join("") + [0, 1, 2, 3].map(i => r(170, 106 + i * 20, 52, 10, C.sky, 1)).join("") + c(256, 168, 18, C.green) + p("M256 186v10", "none")),
  home: wrap(r(104, 44, 112, 152, C.cream, 2) + r(124, 60, 72, 136, C.brown, 2) + r(132, 68, 56, 128, C.peach, 1)
    + [96, 112, 126, 138].map((y, i) => p(`M190 ${y}h-14`, "none") + `<text x="196" y="${y + 4}" font-size="9" fill="${INK}" stroke="none" font-family="sans-serif">${["15", "12", "9", "6"][i]}</text>`).join("")
    + p("M248 110l-22 76", "none") + p("M214 186l12-4l16 8l-6 8l-24-4z", C.yellow)),
  meeting: wrap(r(96, 40, 128, 88, C.paper, 4) + p("M160 128v20M140 148h40") + c(136, 84, 24, C.sky) + p("M136 84V60A24 24 0 0 1 158 92Z", C.orange) + lines(176, 70, 34, 4, 12)
    + [70, 110, 150, 190, 230].map((x, i) => c(x + 10, 176, 13, [C.purple, C.teal, C.orange, C.blue, C.yellow][i])).join("")),
};

/* 封面上的人物（跟島上的豆子人同一種造型，各自帶一樣小道具） */
export function portrait(id: string): string {
  const body: Record<string, string> = { agent: C.orange, owner: C.blue, couple: C.teal, sales: C.purple, senior: "#e8673a", banker: C.dark, landlord: C.brown, landowner: "#6aa84f" };
  const b = body[id] || C.orange;
  let extra = "";
  if (id === "agent") extra = r(150, 112, 20, 34, C.dark, 3) + r(154, 116, 12, 24, C.sky, 2) + p("M160 100l-5 12h10z", C.yellow);
  if (id === "owner") extra = p("M146 66h28", "none") + `<circle cx="152" cy="68" r="6" fill="none"/><circle cx="168" cy="68" r="6" fill="none"/>` + p("M138 120q22 10 44 0", "none");
  if (id === "sales") extra = r(186, 70, 4, 70, C.grey, 1) + p("M190 70h26l-6 9l6 9h-26", C.orange);
  if (id === "senior") extra = p("M140 58q20-26 40 0z", C.paper) + p("M134 58h52", "none") + r(178, 104, 24, 30, C.brown, 3) + r(182, 108, 16, 22, C.paper, 2);
  if (id === "banker") extra = p("M160 98l-6 6l6 26l6-26z", C.orange) + p("M146 96l14 10l14-10", "none");
  if (id === "landlord") extra = c(194, 120, 8, "none") + p("M194 128v20M194 140h8M194 146h6", "none");
  if (id === "landowner") extra = p("M142 56q18-14 36 0v6h-36z", C.yellow) + p("M200 80l-10 70M182 150l8-6l10 4l-4 10z", C.brown);
  const one = (x: number, col: string) => `<g transform="translate(${x} 0)"><rect x="-26" y="88" width="52" height="84" rx="26" fill="${col}"/><circle cx="0" cy="70" r="26" fill="#f5d2b8"/><circle cx="-8" cy="68" r="2.6" fill="${INK}" stroke="none"/><circle cx="8" cy="68" r="2.6" fill="${INK}" stroke="none"/><ellipse cx="-14" cy="78" rx="5" ry="3" fill="${C.pink}" stroke="none"/><ellipse cx="14" cy="78" rx="5" ry="3" fill="${C.pink}" stroke="none"/><path d="M-6 80q6 5 12 0" fill="none"/></g>`;
  const figs = id === "couple" ? one(132, C.teal) + one(190, C.yellow) + p("M156 132q5-8 10 0", "none") : one(160, b);
  return wrap(figs + extra);
}
