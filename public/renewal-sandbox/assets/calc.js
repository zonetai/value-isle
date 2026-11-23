/* ============================================================
   權變沙盤 — 計算引擎
   四個數字：A 更新前權值、B 更新後總價、C 共同負擔、分回。
   規則庫（RULES）與計算分離；門檻多為教學門檻，非審議標準。
   ============================================================ */
(function(){
  const D = () => window.RS;
  const RULES = {
    tpe: { name: "臺北市",
      shopRange: [1.5, 2.0], publicRange: [28, 36], lotAdjMax: 15,
      bonusCap: 50, settleWarn: 0.2 }
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
    add("burden_ratio", "note", `共負比假設值 ${f(d)}%`,
      "共同負擔占更新後總價的比例，這裡是你拉的假設值。", "實際共負比由實施者依提列標準提列、經審議會審議決定，每案不同；本站不給區間、不下結論。", "去共同負擔試算站照提列標準逐項算，再回來帶入。", "都市更新條例第 51 條、權利變換實施辦法第 19 條");
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
    add("floor_eff", "note", `樓層別效用比：示範假設`,
      "各戶占比用到的樓層別與位置別效用比。", "本站用的是教學示範值，不是標準。實務上依個案的比較案例與使用情況由三家估價師查估，無電梯棟不會出現高樓層加分。", "看估價報告書的效用比表與其依據。", "不動產估價技術規則第十二章；全聯會第六號公報");
    const sr = Math.abs(r.settle) / r.myValue;
    add("settle", sr > R.settleWarn ? "note" : "ok", `我家找補 ${Math.round(r.settle / 10000).toLocaleString("zh-TW")} 萬元`,
      "選配價值與應分配價值的差額。", `找補超過分回價值的 ${R.settleWarn * 100}% 時，通常是選配坪數與分回價值不匹配。`, "調整選配坪數或樓層，讓找補縮小。", "分回比例與公平性");
    add("b_support", "note", `更新後均價 ${Math.round(r.input.after.resPrice / 10000).toLocaleString("zh-TW")} 萬元/坪`,
      "B 值有沒有市場支撐，是分回能不能兌現的關鍵。", "要對照周邊近兩年新成屋成交的中位數與分位；本站不含成交資料，請自行對照。", "去價值島「市場潮位」看該區單價，或查實價登錄。", "更新後 B 值：銷售價格市場支撐性");
    return out;
  }

  window.RSC = { RULES, expandUnits, calcA, calcB, distribute, run, scenarios, sensitivity, check, effAfter, toThousand };
})();
