/* ============================================================
   權變沙盤 — 計算引擎
   四個數字：A 更新前權值、B 更新後總價、C 共同負擔、分回。
   規則庫（RULES）與計算分離；門檻多為教學門檻，非審議標準。
   ============================================================ */
(function(){
  const D = () => window.RS;
  const RULES = {
    tpe: { name: "臺北市",
      burdenRange: [30, 45], shopRange: [1.5, 2.0], publicRange: [28, 36], lotAdjMax: 15,
      bonusCap: 50, settleWarn: 0.2, ownerShareWarn: 50,
      salesMgmtMax: 6, riskMgmtMax: 14, adminMgmtMax: 3.5, profitNote: 20 }
  };
  const round = (x, d = 0) => { const p = Math.pow(10, d); return Math.round(x * p) / p; };
  const toThousand = x => Math.round(x / 1000) * 1000;

  /* ---------- 從示範基地展開四十戶 ---------- */
  function expandUnits(site) {
    const out = [];
    site.lots.forEach(l => {
      const n = l.floors * site.unitsPerFloor;
      const landEach = l.ping / n;
      for (let f = 1; f <= l.floors; f++) for (let u = 1; u <= site.unitsPerFloor; u++) {
        const shop = f === 1 && site.shopLots.includes(l.id);
        out.push({ id: `${l.id}-${f}-${u}`, lot: l.id, floor: f, use: shop ? "shop" : "res",
          landPing: round(landEach, 2), bldgPing: f === 1 ? site.bldgPing + 3 : site.bldgPing });
      }
    });
    return out;
  }

  /* ---------- A 值鏈 ---------- */
  function calcA(site, units, mode) {
    const d = D();
    const lots = site.lots.map(l => {
      const sum = Object.values(l.adj).reduce((a, b) => a + Number(b || 0), 0);
      const unit = toThousand(site.baseUnit * (1 + sum / 100));
      return { ...l, adjSum: sum, unitBefore: unit, totalBefore: unit * l.ping };
    });
    const totalPing = lots.reduce((a, l) => a + l.ping, 0);
    const mergedTotal = site.baseUnit * totalPing;
    const sumBefore = lots.reduce((a, l) => a + l.totalBefore, 0);
    const coef = mergedTotal / sumBefore;
    lots.forEach(l => { l.totalAfter = l.totalBefore * coef; });

    const rows = units.map(u => {
      const lot = lots.find(l => l.id === u.lot);
      const eff = d.effBefore[u.floor] ?? d.effBefore[5];
      const factor = u.use === "shop" ? d.shopFactor : 1;
      const w = mode === "land" ? u.landPing : u.bldgPing * eff * factor;
      return { ...u, eff, factor, w, lotTotal: lot.totalAfter };
    });
    const wByLot = {};
    rows.forEach(r => { wByLot[r.lot] = (wByLot[r.lot] || 0) + r.w; });
    rows.forEach(r => { r.share = r.w / wByLot[r.lot]; r.A = r.lotTotal * r.share; });
    const sumA = rows.reduce((a, r) => a + r.A, 0);
    rows.forEach(r => { r.pct = r.A / sumA; });
    return { lots, totalPing, mergedTotal, sumBefore, coef, rows, sumA };
  }

  /* ---------- B 值 ---------- */
  function calcB(site, after, totalPing) {
    const d = D();
    const farTotal = site.farLegal * (1 + after.bonus / 100);
    const farPing = totalPing * farTotal / 100;
    const sellPing = farPing * d.extraRatio / (1 - after.publicRatio / 100);
    const shopArea = after.hasShop ? sellPing / after.floors : 0;
    const resArea = sellPing - shopArea;
    const S_shop = shopArea * after.shopPrice, S_res = resArea * after.resPrice, S_park = after.parkN * after.parkPrice;
    return { farTotal, farPing, sellPing, sellRatio: sellPing / farPing, shopArea, resArea, S_shop, S_res, S_park, B: S_shop + S_res + S_park };
  }

  /* ---------- 分回 ---------- */
  function effAfter(floor, after) { return floor <= 1 ? 1 : 1 + (floor - 2) * D().effAfterStep; }
  function distribute(a, b, ratio, after, me, pick) {
    const C = b.B * ratio / 100;
    const landValue = b.B - C;
    const my = a.rows.find(r => r.id === me) || a.rows[0];
    const myValue = landValue * my.pct;
    const pickPrice = pick.use === "shop" ? after.shopPrice : after.resPrice * effAfter(pick.floor, after);
    const pingBack = myValue / pickPrice;
    const pickPing = pick.ping > 0 ? pick.ping : Math.ceil(pingBack);
    const settle = pickPing * pickPrice - myValue;
    return { C, landValue, ownerShare: landValue / b.B, my, myValue, pickPrice, pingBack, pickPing, settle, multiple: myValue / my.A };
  }

  /* ---------- 整合：一次算完 ---------- */
  function run(input) {
    const site = input.site, after = { ...input.after, bonus: input.site.bonus };
    const units = input.units || expandUnits(site);
    const a = calcA(site, units, input.mode || "building");
    const b = calcB(site, after, a.totalPing);
    const dist = distribute(a, b, input.burdenRatio, after, input.me, input.pick);
    return { input, units, a, b, ratio: input.burdenRatio, ...dist };
  }

  function scenarios(input) {
    const R = RULES[input.city || "tpe"];
    return D().scenarios.map(s => {
      const bonus = Math.max(0, Math.min(R.bonusCap, input.site.bonus + s.bonus));
      const inp = { ...input,
        site: { ...input.site, bonus },
        after: { ...input.after, resPrice: input.after.resPrice * (1 + s.price / 100), shopPrice: input.after.shopPrice * (1 + s.price / 100) },
        burdenRatio: Math.max(0, input.burdenRatio + s.ratio) };
      return { ...s, bonusUsed: bonus, r: run(inp) };
    });
  }

  /* ---------- 敏感度：每個參數上下各動一次，看我家分回坪 ---------- */
  function sensitivity(input) {
    const base = run(input).pingBack;
    const tests = [
      { t: "更新後均價 ±10%", f: k => ({ ...input, after: { ...input.after, resPrice: input.after.resPrice * (1 + .1 * k), shopPrice: input.after.shopPrice * (1 + .1 * k) } }) },
      { t: "共負比 ±5 點", f: k => ({ ...input, burdenRatio: input.burdenRatio - 5 * k }) },
      { t: "獎勵容積 ±10 點", f: k => ({ ...input, site: { ...input.site, bonus: Math.max(0, input.site.bonus + 10 * k) } }) },
      { t: "公設比 ±3 點", f: k => ({ ...input, after: { ...input.after, publicRatio: input.after.publicRatio - 3 * k } }) },
      { t: "比準地單價 ±10%", f: k => ({ ...input, site: { ...input.site, baseUnit: input.site.baseUnit * (1 + .1 * k) } }) },
      { t: "我家所在宗調整率 ±3 點", f: k => { const me = (input.units || expandUnits(input.site)).find(u => u.id === input.me); const lots = input.site.lots.map(l => l.id === me.lot ? { ...l, adj: { ...l.adj, road: Number(l.adj.road) + 3 * k } } : l); return { ...input, site: { ...input.site, lots } }; } }
    ];
    return tests.map(t => { const up = run(t.f(1)).pingBack - base, dn = run(t.f(-1)).pingBack - base; return { t: t.t, up, dn, span: Math.abs(up) + Math.abs(dn) }; }).sort((x, y) => y.span - x.span);
  }

  /* ---------- 燈號：{id, level: warn|note|ok, title, why, rule, fix, src} ---------- */
  function check(r) {
    const R = RULES[r.input.city || "tpe"], out = [];
    const add = (id, level, title, why, rule, fix, src) => out.push({ id, level, title, why, rule, fix, src });
    const f = (x, d = 1) => Number(x).toFixed(d);
    const d = r.ratio;
    add("burden_ratio", d > R.burdenRange[1] ? "warn" : (d < R.burdenRange[0] ? "note" : "ok"), `共負比 ${f(d)}%`,
      "共同負擔占更新後總價的比例。", `常見區間 ${R.burdenRange[0]}% 至 ${R.burdenRange[1]}%；超過上限要有強說明，低於下限要確認費用有沒有漏列。`, "先逐項對提列總表，再看更新後總價有沒有被喊高。", "審查方法論：共擔比例合理性（教學門檻）");
    const shopRatio = r.input.after.shopPrice / r.input.after.resPrice;
    if (r.input.after.hasShop) add("shop_ratio", (shopRatio < R.shopRange[0] || shopRatio > R.shopRange[1]) ? "note" : "ok", `店面與樓上單價倍數 ${f(shopRatio, 2)}`,
      "一樓店面單價除以樓上住宅均價。", `常態 ${R.shopRange[0]} 至 ${R.shopRange[1]} 倍；臨路條件特殊時可偏離，但要有案例支撐。`, "找同路段新成屋的一樓成交對照。", "更新後 B 值：產品類型分別估價（教學門檻）");
    const pr = r.input.after.publicRatio;
    add("public_ratio", (pr < R.publicRange[0] || pr > R.publicRange[1]) ? "note" : "ok", `公設比 ${f(pr, 0)}%`,
      "公設比決定銷售坪數，直接放大或縮小 B 值。", `常見 ${R.publicRange[0]}% 至 ${R.publicRange[1]}%。`, "公設比偏低時，銷坪比會偏低，B 值被低估；偏高則相反。", "更新後 B 值（教學門檻）");
    const est = r.b.farTotal / r.input.site.bcr;
    add("floors", Math.abs(est - r.input.after.floors) > 3 ? "note" : "ok", `容積率 ÷ 建蔽率 ≈ ${f(est, 1)} 層，規劃 ${r.input.after.floors} 層`,
      "容積率除以建蔽率約等於樓層數。", "差距大代表建蔽率沒用滿或樓層數另有考量，要說明。", "回頭看建築規劃條件是否三家一致。", "形式要件：建築規劃條件一致性");
    const maxAdj = Math.max(...r.a.lots.map(l => Math.abs(l.adjSum)));
    add("a_spread", maxAdj > R.lotAdjMax ? "note" : "ok", `各宗調整率最大 ±${f(maxAdj, 1)}%`,
      "各宗與比準地的差異。", `調整幅度超過 ${R.lotAdjMax}% 的宗要有明確條件差異。`, "逐項看臨路、角地、地形的方向是否與現況一致。", "更新前 A 值：各宗單價差異是否有理由");
    add("owner_share", r.ownerShare * 100 < R.ownerShareWarn ? "note" : "ok", `地主分回 ${f(r.ownerShare * 100)}%`,
      "更新後總價扣掉共同負擔後，地主拿到的比例。", `低於 ${R.ownerShareWarn}% 時提醒檢視 B 值與 C 值。`, "先看共負比，再看更新後總價的市場支撐。", "分回比例與公平性（教學門檻）");
    const sr = Math.abs(r.settle) / r.myValue;
    add("settle", sr > R.settleWarn ? "note" : "ok", `我家找補 ${Math.round(r.settle / 10000).toLocaleString("zh-TW")} 萬元`,
      "選配價值與應分配價值的差額。", `找補超過分回價值的 ${R.settleWarn * 100}% 時，通常是選配坪數與分回價值不匹配。`, "調整選配坪數或樓層，讓找補縮小。", "分回比例與公平性");
    add("b_support", "note", `更新後均價 ${Math.round(r.input.after.resPrice / 10000).toLocaleString("zh-TW")} 萬元/坪`,
      "B 值有沒有市場支撐，是分回能不能兌現的關鍵。", "要對照周邊近兩年新成屋成交的中位數與分位；本站不含成交資料，請自行對照。", "去價值島「市場潮位」看該區單價，或查實價登錄。", "更新後 B 值：銷售價格市場支撐性");
    return out;
  }

  /* ---------- 共同負擔拆解（burden.html） ---------- */
  function burden(inp, b, site, after) {
    const R = RULES[inp.city || "tpe"];
    const abovePing = b.farPing * D().extraRatio;
    const belowPing = site.totalPing * inp.construction.digRate / 100 * inp.construction.floorsDown;
    const construction = (abovePing + belowPing) * inp.construction.unit;
    const items = {
      construction,
      adminMgmt: construction * inp.adminMgmt / 100,
      salesMgmt: b.B * inp.salesMgmt / 100,
      trustMgmt: b.B * inp.trustMgmt / 100,
      interest: construction * inp.interest.loanRatio / 100 * inp.interest.rate / 100 * inp.interest.months / 12 / 2,
      tax: b.B * inp.tax / 100,
      bonusFee: b.B * inp.bonusFee / 100,
      other: b.B * inp.other / 100
    };
    /* 風險管理費以其他費用合計為基數；另列實施者利潤者以總銷為基數 */
    const baseForRisk = Object.values(items).reduce((x, y) => x + y, 0);
    items.riskMgmt = baseForRisk * inp.riskMgmt / 100;
    items.profit = b.B * inp.profit / 100;
    const C = Object.values(items).reduce((x, y) => x + y, 0);
    const checks = [];
    const add = (id, level, title, why, rule, fix, src) => checks.push({ id, level, title, why, rule, fix, src });
    const ratio = C / b.B * 100;
    add("burden_ratio", ratio > R.burdenRange[1] ? "warn" : (ratio < R.burdenRange[0] ? "note" : "ok"), `共負比 ${ratio.toFixed(1)}%`, "十項加總除以更新後總價。", `常見區間 ${R.burdenRange[0]}% 至 ${R.burdenRange[1]}%。`, "看下面哪一項燈號亮。", "審查方法論（教學門檻）");
    add("admin_public", inp.isPublic && inp.adminMgmt > 0 ? "warn" : "ok", `人事行政管理費 ${inp.adminMgmt}%${inp.isPublic ? "（公辦）" : ""}`, "公辦都更由公部門主導，沒有實施者人事成本。", "公辦都更不得提列人事行政管理費。", "改為零，或確認實施方式。", "費用提列總表");
    add("admin_max", !inp.isPublic && inp.adminMgmt > R.adminMgmtMax ? "note" : "ok", `人事行政管理費率 ${inp.adminMgmt}%`, "依總工程費一定比例提列。", `教學門檻 ${R.adminMgmtMax}%，實際上限以提列總表為準。`, "對照提列總表的比例。", "費用提列總表");
    add("sales_tier", inp.salesMgmt > R.salesMgmtMax ? "warn" : (inp.salesMgmt >= R.salesMgmtMax - 0.01 ? "note" : "ok"), `銷售管理費率 ${inp.salesMgmt}%`, "依總銷金額分段提列，級距愈高費率愈低。", `最高級距費率 ${R.salesMgmtMax}%；整筆套最高費率不符分段精神。`, "依總銷級距分段算一次。", "費用提列總表：銷售管理費");
    add("risk", inp.riskMgmt > R.riskMgmtMax ? "warn" : (inp.riskMgmt > R.riskMgmtMax - 2 ? "note" : "ok"), `風險管理費率 ${inp.riskMgmt}%`, "實施者承擔風險的對價。", `得以上限提列，但需檢視是否實質承擔風險；教學門檻 ${R.riskMgmtMax}%。`, "看出資、保證、信託是誰在做。", "費用提列總表：風險管理費");
    add("trust", inp.trustMgmt > 0 && !inp.hasTrust ? "warn" : "ok", `信託管理費率 ${inp.trustMgmt}%`, "有辦信託才有這筆費用。", "未實際辦理信託不得提列。", "附信託契約。", "費用提列總表");
    add("interest_period", inp.interest.months > inp.interest.workMonths ? "warn" : "ok", `計息 ${inp.interest.months} 個月，工期 ${inp.interest.workMonths} 個月`, "利息只能算工程期間。", "計息期間不得超過實際工期，不得把銷售期納入。", "把計息月數改成工期月數。", "審查方法論：貸款利息");
    add("profit", inp.profit > 0 ? "note" : "ok", `另列實施者利潤 ${inp.profit}%`, "臺北市的實施者報酬是以風險管理費提列。", "風險管理費之外另列利潤者，要說明與風險管理費的關係，避免重複。", "二擇一，或說明兩者分別對應什麼。", "審查方法論：實施者利潤");
    const riskShare = items.riskMgmt / C * 100;
    add("risk_share", riskShare > R.profitNote ? "note" : "ok", `風險管理費占共同負擔 ${riskShare.toFixed(1)}%`, "實施者報酬占全部成本的比重。", `超過 ${R.profitNote}% 時提醒對照同期核定案（教學門檻）。`, "看同期核定案的分布。", "審查方法論：實施者利潤");
    add("other", inp.other > 3 ? "note" : "ok", `其他費用 ${inp.other}%`, "拆遷補償、安置、公益設施。", "每一項都要找得到計畫書對應頁數。", "逐項列示由誰負擔。", "審查方法論：共擔分攤邏輯");
    return { items, C, ratio, checks, abovePing, belowPing };
  }

  window.RSC = { RULES, expandUnits, calcA, calcB, distribute, run, scenarios, sensitivity, check, burden, effAfter, toThousand };
})();
