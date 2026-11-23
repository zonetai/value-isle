/* ============================================================
   權變沙盤 — 共同負擔案件試算引擎
   臺北市與新北市的提列標準寫在 CITY 規則庫，計算與規則分離。
   來源：
   ・臺北市「都市更新事業及權利變換計畫內有關費用提列總表」110.01.15 版
     （113.10.30 修訂版增列項目並註明各管理費率為可提列上限，費率沿用）
   ・臺北市「都市更新事業(重建區段)建築物工程造價要項」113.02（物價基準日 112.11）
   ・新北市「都市更新權利變換計畫提列共同負擔項目及金額基準」110.09.08 版
   ・新北市都市更新案件共同負擔提列情形分析（營建單價物價基準日 112.04）
   數值以主管機關現行公告為準；本引擎為教學簡化，部分項目以參數代入。
   ============================================================ */
(function(){
  const M2 = 3.3058;   /* 1 坪 = 3.3058 ㎡ */
  const PING = 0.3025;

  const CITY = {
    tpe: {
      name: "臺北市", ver: "提列總表 110.01.15 版費率；造價要項 113.02",
      unitBasis: "m2",
      /* 元/㎡，依構造、樓層、建材等級（第二級中高級、第三級高級） */
      cost: {
        SC:  { 2: { 6: 54700, 11: 59200, 16: 69100, 21: 76100, 26: 80400, 31: 83900, 36: 87600, 41: 90300 }, 3: { 6: 66200, 11: 71600, 16: 83400, 21: 92100, 26: 98100, 31: 102400, 36: 106600, 41: 109900 } },
        SRC: { 2: { 6: 52800, 11: 56500, 16: 62600, 21: 68700, 26: 73300, 31: 76400, 36: 80400 }, 3: { 6: 63700, 11: 69000, 16: 76300, 21: 83500, 26: 88500, 31: 92900, 36: 97200 } },
        RC:  { 2: { 1: 34300, 6: 43900, 11: 49300, 16: 53600, 21: 59000 }, 3: { 1: 42900, 6: 55000, 11: 61700, 16: 67800, 21: 73600 } }
      },
      costNote: "單價已含綠建築合格級與分戶樓板隔音；物價指數增減率超過 2.5% 之部分另調。",
      /* 地下層超建加成：地上 1~6 層超過 B1、7~15 層超過 B2、16 層以上超過 B3，超建各層加 30/40/50/60% */
      basementAllow: f => f <= 6 ? 1 : (f <= 15 ? 2 : 3), basementAdd: [0.3, 0.4, 0.5, 0.6],
      demolish: { RC: 1050, brick: 800 }, /* 元/㎡，4~5 樓 */
      drill: 75000, utility: 75000, cadastre: 20000, neighbor: 6000,
      /* 估價費（萬元）：每家 40 + (A+B+C) × D；三家；選定費為基本費 30%、不低於 25 萬 */
      appraisal: (n) => { const d = n <= 100 ? 0.5 : 0.45; const base = 40 + n * d; return (base * 3 + Math.max(base * 0.3, 25)) * 1e4; },
      adminRate: pub => pub < 25 ? 5 : (pub < 50 ? 4.5 : (pub < 75 ? 3.5 : 3)),
      adminBase: "A+B+C+D+E+F+G",
      salesTiers: [[30e8, 6], [50e8, 4.5], [Infinity, 3]],
      riskTable: { area: [500, 1000, 2000, 3000, 4000, 5000], people: [5, 35, 75, 125],
        rows: [[10, 10.5, 10.75, 11, 11.25], [11, 11.25, 11.5, 11.75, 12], [11.75, 12, 12.25, 12.5, 12.75], [12.5, 12.75, 13, 13.25, 13.5], [13.25, 13.5, 13.75, 14, 14], [14, 14, 14, 14, 14]] },
      riskCap: 16, riskExtra: { after: 36, perMonth: 0.02 },
      riskBase: "A+B+C+D+E+F+G+H(不含營業稅)+I",
      finance: { own: 0.3, loan: 0.7, ownRate: 1.725, loanRate: 2.5 },
      period: (bf, uf) => ({ pre: 6, build: 2.5 * bf + 1.2 * uf, post: 6 }),
      periodNote: "核定後至開工 6 個月＋地下每層 2.5 個月＋地上每層 1.2 個月＋使照後登記 6 個月"
    },
    ntpc: {
      name: "新北市", ver: "提列基準 110.09.08 版費率；營建單價物價基準日 112.04",
      unitBasis: "ping",
      /* 元/坪，依構造、樓層、總樓地板面積級距（未滿 2,500 坪／2,500~7,500／7,500 以上） */
      cost: {
        SC:  { 0: { 6: 173405, 11: 187785, 16: 220809, 21: 237615, 26: 257976, 31: 270649 }, 2500: { 6: 165119, 11: 178889, 16: 210329, 21: 230801, 26: 245790, 31: 257854, 36: 268334 }, 7500: { 6: 160245, 11: 173527, 16: 203992, 21: 223855, 26: 238356, 31: 250055, 36: 260291 } },
        SRC: { 0: { 6: 166216, 11: 180229 }, 2500: {}, 7500: {} },
        RC:  { 0: { 6: 138797, 11: 155248, 16: 170481, 21: 186932, 26: 205698 }, 2500: { 6: 132095, 11: 147815, 16: 162316, 21: 178036, 26: 195827 }, 7500: { 6: 128196, 11: 143428, 16: 157442, 21: 172674, 26: 189978 } }
      },
      costNote: "112.04 物價基準；新北市 113.12 試算值高出約兩成至三成，報核時依評價基準日物價指數調整。",
      basementAllow: f => f <= 6 ? 1 : (f <= 15 ? 2 : 3), basementAdd: [0.3, 0.4, 0.5, 0.6],
      demolish: { RC: 1050, brick: 800 },
      drill: 75000, utility: 75000, cadastre: 20000, neighbor: 6000,
      appraisal: (n) => { const d = n <= 100 ? 0.5 : 0.45; const base = 40 + n * d; return (base * 3 + Math.max(base * 0.3, 25)) * 1e4; },
      adminTable: { site: [1500, 2500], owners: [30, 150], rows: [[4, 4.5, 5], [4.5, 5, 5.5], [5, 5.5, 6]] },
      adminBase: "A+C+G",
      adminFee: 2.5, /* 行政作業費 F1：公告現值總值 × 2.5% */
      salesTiers: [[25e8, 6], [50e8, 5.5], [Infinity, 5]],
      riskTable: { floor: [2500, 7500], owners: [30, 100], rows: [[12, 12.5, 13], [12.5, 13, 13.5], [13, 13.5, 14]] },
      riskCap: 14, riskSelf: 14,
      riskBase: "A+C+D+F1+F2+F3+G+H",
      finance: { own: 0.3, loan: 0.7, ownRate: 1.725, loanRate: 2.5 },
      period: (bf, uf) => ({ pre: 0, build: 4 + 2 * Math.max(0, bf - 1) + 1 * uf, post: 12 }),
      periodNote: "施工期間（地下一層 4 個月、每多一層加 2 個月；地上每層 1 個月）加 12 個月為上限"
    }
  };

  const lookup = (tbl, keys, v) => { let r = tbl[keys[0]]; for (const k of keys) if (v >= k) r = tbl[k]; return r; };
  const floorKey = (tbl, f) => { const ks = Object.keys(tbl).map(Number).sort((a, b) => a - b); let r = null; for (const k of ks) if (f >= k) r = k; return r === null ? ks[0] : r; };

  function unitCost(city, c) {
    const R = CITY[city];
    if (city === "tpe") {
      const t = R.cost[c.structure][c.grade] || R.cost[c.structure][2];
      const k = floorKey(t, c.floorsUp); return { perM2: t[k], perPing: t[k] * M2, key: `${c.structure} ${k} 層級距 第${c.grade === 3 ? "三" : "二"}級` };
    }
    const band = c.totalPing < 2500 ? 0 : (c.totalPing < 7500 ? 2500 : 7500);
    let t = R.cost[c.structure][band]; if (!t || !Object.keys(t).length) t = R.cost[c.structure][0];
    const k = floorKey(t, c.floorsUp); return { perM2: t[k] / M2, perPing: t[k], key: `${c.structure} ${k} 層級距 總樓地板${band === 0 ? "未滿 2,500" : band === 2500 ? " 2,500~7,500" : " 7,500 以上"}坪` };
  }

  function tiered(v, tiers) { let out = 0, prev = 0; for (const [cap, r] of tiers) { if (v <= prev) break; out += (Math.min(v, cap) - prev) * r / 100; prev = cap; } return out; }

  function riskRate(city, c) {
    const R = CITY[city], T = R.riskTable;
    if (city === "tpe") {
      let ai = 0; T.area.forEach((a, i) => { if (c.siteM2 >= a) ai = i; });
      let pi = 0; T.people.forEach((p, i) => { if (c.owners > p) pi = i + 1; });
      return T.rows[ai][pi];
    }
    let fi = 0; T.floor.forEach((f, i) => { if (c.totalPing > f) fi = i + 1; });
    let oi = 0; T.owners.forEach((o, i) => { if (c.owners > o) oi = i + 1; });
    return T.rows[fi][oi];
  }
  function adminRate(city, c) {
    const R = CITY[city];
    if (city === "tpe") return R.adminRate(c.publicPct);
    const T = R.adminTable; let si = 0; T.site.forEach((s, i) => { if (c.siteM2 >= s) si = i + 1; });
    let oi = 0; T.owners.forEach((o, i) => { if (c.owners > o) oi = i + 1; });
    return T.rows[si][oi];
  }

  /* ---------- 主計算：回傳逐項金額、公式、燈號 ---------- */
  function run(city, c) {
    const R = CITY[city], items = [], f = (x, d = 0) => Number(x).toLocaleString("zh-TW", { maximumFractionDigits: d });
    const add = (g, k, t, v, how) => items.push({ g, k, t, v: Math.round(v), how });
    const uc = unitCost(city, c);
    const cpi = 1 + Math.max(0, Math.abs(c.cpi) - 2.5) / 100 * Math.sign(c.cpi);
    const unitAdj = uc.perPing * cpi * (1 + c.smart / 100);
    const aboveArea = c.abovePing, belowArea = c.belowPing;
    /* 地下層超建加成：超建層按比例分攤地下面積 */
    const allow = R.basementAllow(c.floorsUp), extra = Math.max(0, c.floorsDown - allow);
    let belowCost = 0; const perLevel = c.floorsDown ? belowArea / c.floorsDown : 0;
    for (let i = 0; i < c.floorsDown; i++) { const over = i - allow; belowCost += perLevel * unitAdj * (over >= 0 ? 1 + R.basementAdd[Math.min(over, 3)] : 1); }
    const build = aboveArea * unitAdj + belowCost;
    add("A", "build", "營建費用", build, `地上 ${f(aboveArea)} 坪 × ${f(unitAdj)} 元/坪 ＋ 地下 ${f(belowArea)} 坪（${extra ? `超建 ${extra} 層加成` : "無超建加成"}）；單價依 ${uc.key}${c.cpi ? `，物價調整 ${c.cpi}%` : ""}${c.smart ? `，智慧建築調整率 ${c.smart}%` : ""}`);
    const demolish = c.oldPing * M2 * R.demolish.RC;
    add("A", "demolish", "拆除費用", demolish, `更新前建物 ${f(c.oldPing)} 坪 × ${M2} × ${f(R.demolish.RC)} 元/㎡（RC 4~5 樓）`);
    const design = build * c.designPct / 100;
    add("A", "design", "建築設計費與相關規費", design, `營建費用 × ${c.designPct}%（教學參數，實務依建築師公會酬金標準與合約）`);
    const holes = Math.max(2, Math.ceil(c.siteM2 / 600));
    add("A", "drill", "鑽探費用", holes * R.drill, `${holes} 孔 × ${f(R.drill)} 元/孔（基地每 600 ㎡ 一點，至少 2 點）`);
    add("A", "utility", "外接水電瓦斯管線", c.units * R.utility, `更新後 ${c.units} 戶 × ${f(R.utility)} 元/戶`);
    add("A", "neighbor", "鄰房鑑定費", c.neighbors * R.neighbor, `鑑定範圍 ${c.neighbors} 戶 × ${f(R.neighbor)} 元/戶（51~100 戶級距）`);
    const A = items.filter(i => i.g === "A").reduce((s, i) => s + i.v, 0);
    const B = c.publicFacility * 1e4; if (B) add("B", "pub", "公共設施費用", B, "依實際開闢成本");
    const Cb = c.bonusFee * 1e4; if (Cb) add("C", "bonus", "申請容積獎勵所支付之費用", Cb, "標章審查費、保證金利息等，核實");
    const plan = c.planFee * 1e4;
    add("D", "plan", "都市更新規劃費", plan, "依規模與審議複雜度，合約金額認列（本例為參數）");
    const appr = R.appraisal(c.apprCount);
    add("D", "appr", "估價費用（三家）", appr, `每家 40 ＋ ${c.apprCount} 筆 × ${c.apprCount <= 100 ? 0.5 : 0.45} 萬元，三家加選定費`);
    add("D", "cad", "地籍整理費", c.units * R.cadastre, `更新後 ${c.units} 戶 × ${f(R.cadastre)} 元/戶，另加地政規費（未計）`);
    const comp = c.compensation * 1e4;
    add("D", "comp", "拆遷補償與安置費", comp, "依專業估價查估之補償單價 × 面積（本例為參數）");
    const D = items.filter(i => i.g === "D").reduce((s, i) => s + i.v, 0);
    const E = c.farTransfer * 1e4; if (E) add("E", "far", "容積移轉費用", E, "核實");
    const Fc = c.planChange * 1e4; if (Fc) add("F", "plan", "都市計畫變更負擔", Fc, "依核定協議書");
    /* 貸款利息 */
    const self = c.mode === "self";
    const own = self ? 0 : R.finance.own, loan = self ? 1 : R.finance.loan;
    const r = (own * c.ownRate + loan * c.loanRate) / 100;
    const P = R.period(c.floorsDown, c.floorsUp), months = P.pre + P.build + P.post, T = months / 12;
    const G = city === "tpe"
      ? (comp + E) * r * T + (A + B + Cb + D + Fc - comp) * r * T * 0.5
      : (comp + Fc + E) * r * T + (A + D - comp) * r * T * 0.5;
    add("G", "int", "貸款利息", G, `年利率 ${(r * 100).toFixed(2)}%（自有 ${own * 100}% × 郵儲 ${c.ownRate}% ＋ 融資 ${loan * 100}% × 五大銀行 ${c.loanRate}%）；期間 ${f(months, 1)} 個月（${R.periodNote}）；拆遷補償全額計息，其餘折半`);
    /* 稅捐：印花稅；營業稅需用共同負擔反算，先估後迭代 */
    const stamp = (build + holes * R.drill + c.neighbors * R.neighbor + plan + appr + c.units * R.cadastre + E) * 0.001;
    add("H", "stamp", "印花稅（承攬契據）", stamp, "承攬相關費用 × 1‰；讓受不動產契據另依實施者獲配現值 × 1‰（未計）");
    /* 管理費：新北 F1 行政作業費 */
    let F1 = 0; if (city === "ntpc") { F1 = c.landValue * 1e4 * R.adminFee / 100; add("I", "f1", "行政作業費 F1", F1, `更新單元內土地公告現值總值 ${f(c.landValue)} 萬 × ${R.adminFee}%`); }
    const trust = city === "ntpc" && !self ? c.trustFee * 1e4 * 0.5 : c.trustFee * 1e4;
    if (c.trustFee) add("I", "trust", "信託管理費", trust, city === "ntpc" ? (self ? "更新會：契約全額" : "一般建商：契約金額之 50%") : "依合約金額");
    const aRate = (city === "tpe" && c.mode === "public") ? 0 : adminRate(city, c);
    const adminBase = city === "tpe" ? A + B + Cb + D + E + Fc + G : A + D + Fc;
    const admin = adminBase * aRate / 100;
    add("I", "admin", city === "ntpc" ? "人事行政管理費 F3" : "人事行政管理費", admin, `（${R.adminBase}）${f(adminBase)} × ${aRate}%${city === "tpe" ? `（公有土地 ${c.publicPct}%${c.mode === "public" ? "，公辦不提列" : ""}）` : `（產權 ${c.owners} 筆、基地 ${f(c.siteM2)} ㎡）`}`);
    /* 營業稅與銷售、風險：相互影響，迭代三次 */
    let vat = 0, sales = 0, risk = 0, riskR = 0, total = 0;
    const baseR = riskRate(city, c);
    for (let it = 0; it < 4; it++) {
      const preTax = A + B + Cb + D + E + Fc + G + stamp + F1 + trust + admin;
      const CC = preTax + vat + sales + risk;
      const implGet = Math.max(0, CC); /* 實施者以更新後房地折價抵付，獲配價值約等於共同負擔 */
      sales = tiered(implGet, R.salesTiers);
      if (city === "tpe") {
        riskR = baseR; if (months > R.riskExtra.after) riskR = Math.min(R.riskCap, baseR * (1 + R.riskExtra.perMonth * (months - R.riskExtra.after)));
        if (c.mode === "public") riskR = R.riskCap;
        risk = (A + B + Cb + D + E + Fc + G + stamp + admin) * riskR / 100;
      } else {
        riskR = (self || c.selfRisk) ? R.riskSelf : baseR;
        risk = (A + D + G + F1 + trust + admin + Fc + E) * riskR / 100;
      }
      const C2 = preTax + sales + risk;
      vat = c.Bval ? Math.max(0, (c.Bval - C2) * ((C2 - B) / c.Bval) * 0.05) : 0;
      total = C2 + vat;
    }
    add("H", "vat", "營業稅", vat, "（更新後總權利價值 − 共同負擔）×（不含營業稅費用及公設用地負擔之共同負擔 ÷ 更新後總權利價值）× 5%");
    add("I", "sales", city === "ntpc" ? "銷售管理費 F4" : "廣告銷售管理費", sales, `實施者實際獲配價值（約＝共同負擔）依級距累加：${R.salesTiers.map(([cap, rr], i) => `${i === 0 ? "" : "超過 " + f(R.salesTiers[i - 1][0] / 1e8) + " 億至 "}${cap === Infinity ? "以上" : f(cap / 1e8) + " 億"} ${rr}%`).join("、")}`);
    add("I", "risk", city === "ntpc" ? "風險管理費 F5" : "風險管理費", risk, `（${R.riskBase}）× ${riskR.toFixed(2)}%${city === "tpe" ? `（基地 ${f(c.siteM2)} ㎡、人數 ${c.owners}；貸款期間 ${f(months, 1)} 個月${months > 36 ? "，超過 36 個月部分每月加基數 2%，上限 16%" : ""}${c.mode === "public" ? "；公辦逕以上限" : ""}）` : `（產權 ${c.owners} 筆、總樓地板 ${f(c.totalPing)} 坪${(self || c.selfRisk) ? "；更新會或共負比低於 40% 得以 14%" : ""}）`}`);
    const groups = { A: "工程費用", B: "公共設施費用", C: "容積獎勵費用", D: "權利變換費用", E: "容積移轉費用", F: "都市計畫變更負擔", G: "貸款利息", H: "稅捐", I: "管理費用" };
    const byGroup = {}; items.forEach(i => { byGroup[i.g] = (byGroup[i.g] || 0) + i.v; });
    const C = items.reduce((s, i) => s + i.v, 0);
    const ratio = c.Bval ? C / c.Bval * 100 : 0;

    /* 燈號 */
    /* 要確認的事：只列出每一項依據什麼、實務上要看什麼，不給判定 */
    const checks = [];
    const chk = (id, title, why, rule, fix, src) => checks.push({ id, level: "note", title, why, rule, fix, src });
    chk("basis", "這是依提列上限的示範試算，不是案件結論", "各項管理費率以總表上限代入，實際提列常低於上限。", "共同負擔由實施者依提列標準提列、經審議會逐項審議決定，每案不同；本站不給區間、不下結論。", "拿估價報告書與計畫書的費用提列表逐項對。", "都市更新條例第 51 條、權利變換實施辦法第 19 條");
    chk("risk_cap", `風險管理費率 ${riskR.toFixed(2)}%（上限代入）`, "實施者承擔風險的對價。", `${R.name}總表所列費率為可提列上限，仍應就個案說明合理性與必要性。`, "看計畫書對承擔了哪些風險的說明。", `${R.name}提列總表`);
    chk("admin", `人事行政管理費率 ${aRate}%（上限代入）`, "實施者的整合與行政成本。", city === "tpe" ? "5% 為上限，公有土地比例高者酌減；公辦都更不提列。" : "依產權級別與基地面積 4% 至 6%，為上限。", "費率依個案說明。", `${R.name}提列總表`);
    chk("period", `貸款期間 ${f(months, 1)} 個月`, "利息與北市的風險加成都跟著期間走。", R.periodNote + "。", "工期拉長要有工法或規模的理由。", `${R.name}提列總表`);
    chk("cpi", `物價調整 ${c.cpi}%`, "單價依評價基準日的營造工程物價指數調整。", "指數增減率絕對值超過 2.5% 的部分才調整。", "附指數來源與基準日。", "造價要項／營建單價基準");
    chk("design", `建築設計費率 ${c.designPct}%（教學參數）`, "本站以參數代入。", "實務依建築師公會酬金標準，另加規費與審查費。", "改用合約金額。", "提列總表：工程費用");
    chk("self", `實施方式：${c.mode === "self" ? "自組更新會" : c.mode === "public" ? "公辦" : "一般建商"}`, "實施方式改變費率與融資假設。", self ? "更新會得全部融資；臺北市人事行政費可改稱更新會運作費用；新北市信託費全額。" : "一般建商自有三成、融資七成。", "確認與計畫書一致。", "提列總表");
    return { items, byGroup, groups, C, ratio, months, r, unit: unitAdj, uc, checks, riskR, aRate };
  }

  window.RSB = { CITY, run, unitCost, riskRate, adminRate, tiered, M2 };
})();
