/* ============================================================
   容積代金學堂 — 雙情境土地開發分析計算引擎
   V ＝ S ÷(1＋R)÷(1＋i) −(C＋M)；單價取位至千位；總價＝單價 × 土地坪數
   規則庫（RULES）與計算分離，換縣市或年度版本只改規則庫。
   ============================================================ */
(function(){
  const PING = 0.3025;
  const RULES = {
    tpe: { name: "臺北市", ver: "113 年修正版範本",
      ratioDecimals: bulkM2 => bulkM2 > 20000 ? 3 : 2,
      profit: [[0,1.5,12,13],[1.5,2,13,14],[2,2.5,14,15],[2.5,3,15,16],[3,3.5,16,17],[3.5,4,17,18],[4,4.5,18,19],[4.5,5,19,20]],
      reviewNote: "容移前、後均不計都市更新審議期間及容積代金審議期間", digCut: 10, caseAgeYears: 3 },
    ntpc: { name: "新北市", ver: "113 年作業注意事項與審議重點（113.9.24）",
      ratioDecimals: () => 3, profit: null,
      reviewNote: "有都更、都審等審查者，依表於土地開發年期或建物工期加計審查期間", digCut: null, caseAgeYears: 5, smallScalePing: 2500 },
    indirect: { design: [2,3], adv: [3,7], mgmt: [4,5], tax: [0.5,1.2] }
  };

  function scen(s, landPing) {
    const S = s.resArea * s.resPrice + (s.shopArea || 0) * (s.shopPrice || 0) + s.parkN * s.parkPrice;
    const direct = s.cost * s.regArea;
    const M = direct * s.design / 100 + S * (s.adv + s.mgmt + s.tax) / 100;
    const V = Math.round(S / (1 + s.R / 100) / (1 + s.i / 100) - (direct + M));
    const unit = Math.round(V / landPing / 1000) * 1000;
    return { S, direct, M, V, unit, total: unit * landPing, sellArea: s.resArea + (s.shopArea || 0) };
  }
  function calc(c) {
    const landPing = c.landM2 * PING, inPing = c.inM2 * PING;
    const a = scen(c.aft, landPing), b = scen(c.bef, landPing);
    const fee = a.total - b.total, feePerPing = fee / inPing;
    return { landPing, inPing, a, b, fee, feePerPing,
      mktRatio: feePerPing / (a.unit / (c.farAft / 100)), priceRatio: feePerPing / c.aft.resPrice,
      ratioA: a.sellArea / (landPing * c.farAft / 100), ratioB: b.sellArea / (landPing * c.farBef / 100),
      dS: a.S - b.S, dDirect: a.direct - b.direct };
  }
  function profitBand(city, years) {
    const t = RULES[city].profit; if (!t) return null;
    for (const [lo, hi, p1, p2] of t) if (years >= lo && years < hi) return [p1, p2];
    const steps = Math.floor((years - 5) / 0.5);
    return [20 + steps, 20 + (steps + 1) * 2];
  }
  /* 檔核：回傳 {id, level: warn|note|ok, title, why, rule, fix, src} */
  function check(c) {
    const r = calc(c), R = RULES[c.city], A = c.aft, B = c.bef, out = [];
    const add = (id, level, title, why, rule, fix, src) => out.push({ id, level, title, why, rule, fix, src });
    const f = (x, d = 2) => Number(x).toFixed(d), n = x => Math.round(x).toLocaleString("zh-TW");
    const dec = R.ratioDecimals(A.regArea / PING), gap = Math.abs(r.ratioA - r.ratioB);
    add("ratio", gap > 0.01 ? "warn" : (+r.ratioA.toFixed(dec) !== +r.ratioB.toFixed(dec) ? "note" : "ok"), `銷坪比：容移後 ${f(r.ratioA,3)}／容移前 ${f(r.ratioB,3)}`,
      "比較兩情境的「不含車位銷售面積 ÷ 容積樓地板面積」。", `${R.name}要求容移前後銷坪比一致，取位至小數點後 ${dec} 位；兩者差 ${f(gap,3)}。`, "先檢查容移前銷售面積是否由容移後銷坪比反推。", "範本 審議原則自主檢核表「一致性原則」");
    add("bcr", A.bcr !== B.bcr ? "warn" : "ok", `實設建蔽率：容移後 ${A.bcr}%／容移前 ${B.bcr}%`,
      "看兩情境的地面層規劃。", "容移前後應維持一致之實設建蔽率，減少之容積由頂層依次遞減。", "容移前不是重新設計一棟樓，而是把容移後方案「削頂」。", "範本 審議原則自主檢核表「一致性原則」");
    add("floors", B.floorsUp > A.floorsUp ? "warn" : (B.floorsUp === A.floorsUp ? "note" : "ok"), `地上樓層：容移後 ${A.floorsUp}F／容移前 ${B.floorsUp}F`,
      "移入容積去了哪裡？", "建蔽率相同時，移入容積應反映為樓層數增加。", "樓層沒變就要說明移入容積如何消化。", "範本 開發量體及產品規劃");
    const cutFloors = A.floorsDown - B.floorsDown, cut = A.digRate ? (A.digRate - B.digRate) / A.digRate * 100 : 0;
    let lv = "ok", rule = "";
    if (cutFloors > 0 && Math.abs(A.digRate - B.digRate) > 0.001) { lv = "warn"; rule = "已減少地下樓層，原則上應維持與容移後相同之開挖率，減層與縮開挖不應併用而無說明。"; }
    else if (cutFloors === 0 && R.digCut && cut > R.digCut) { lv = "warn"; rule = `開挖率縮減 ${f(cut,1)}%，超過容移後開挖率之 ${R.digCut}%（例：70% 不宜低於 63%），超過時以刪減一層為原則。`; }
    else if (cutFloors < 0 || cut < 0) { lv = "warn"; rule = "容移前地下室規模大於容移後，方向相反。"; }
    else rule = cutFloors > 0 ? "減層且開挖率一致，符合原則。" : `開挖率縮減 ${f(cut,1)}%。`;
    add("dig", lv, `地下室：容移後 B${A.floorsDown}、${A.digRate}%／容移前 B${B.floorsDown}、${B.digRate}%`, "容移前的地下室是「減層」還是「縮開挖率」？只能擇一為主。", rule, "地下室調整是為了讓容移前銷坪比與容移後一致，並檢視容移前車位銷售面積是否合理。", "範本 容移前地下室車位數量設置原則");
    if (c.legalPark > 0) add("park", B.parkN < c.legalPark ? "warn" : "ok", `容移前車位 ${B.parkN} 個／法定 ${c.legalPark} 個`, "容移前的車位數從哪裡來？", "容移前應至少滿足法定車位，滿足後之剩餘空間視為增設車位。", "法定車位隨容移前樓地板面積重算。", "範本 容移前地下室車位數量設置原則");
    for (const [k, s, nm] of [["a", A, "容移後"], ["b", B, "容移前"]]) {
      const band = profitBand(c.city, s.years);
      if (band) add("profit_" + k, (s.R < band[0] || s.R > band[1]) ? "warn" : "ok", `${nm}利潤率 ${s.R}%（開發年期 ${s.years} 年）`, "利潤率與開發年期是連動的。", `開發年期 ${s.years} 年對應建議區間 ${band[0]}%～${band[1]}%，設定不同時應說明。`, "先確認開發年期算對，再查表。", "範本 利潤率表");
    }
    if (!R.profit) add("profit_n", "note", "新北市利潤率", "新北市注意事項未附臺北式對照表。", "請依第四號公報及個案開發年期說明利潤率之決定。", "可用臺北市對照表交叉檢視，但報告依據應引新北市規定。", "第四號公報");
    add("profit_gap", A.R < B.R ? "warn" : "ok", `利潤率差：容移後 ${A.R}%／容移前 ${B.R}%`, "哪一個情境開發期比較長？", "容移後量體較大、年期較長，利潤率不應低於容移前。", "同一套邏輯套兩個情境。", "審議原則「容移前後一致之參數邏輯」");
    add("years", A.years < B.years ? "warn" : "ok", `開發年期：容移後 ${A.years} 年／容移前 ${B.years} 年`, "樓層多的那一棟，工期比較長還是比較短？", R.reviewNote + "。", "年期只差在地上、地下樓層數造成的施工月數。", "範本 開發年期；107 年共識會議結論");
    const names = { design: "規劃設計費", adv: "廣告銷售費", mgmt: "管理費", tax: "稅捐" };
    const diff = Object.keys(names).filter(k => A[k] !== B[k]);
    add("ind_same", diff.length ? "warn" : "ok", "間接成本費率一致性" + (diff.length ? `：${diff.map(k => names[k]).join("、")}不一致` : ""), "兩情境的費率欄逐一對照。", "各項間接成本於容移前後之費率應一致，不同應敘明理由。", "費率不同會把「參數差」混進代金。", "範本 p.43 間接成本一致性原則");
    const off = Object.keys(names).filter(k => A[k] < RULES.indirect[k][0] || A[k] > RULES.indirect[k][1]);
    add("ind_range", off.length ? "note" : "ok", "間接成本費率區間" + (off.length ? `：${off.map(k => names[k] + A[k] + "%").join("、")}超出常用區間` : ""), "對照範本的費率區間。", "規劃設計 2～3%、廣告銷售 3～7%、管理費 4～5%、稅捐 0.5～1.2%。", "超出區間不必然錯，但要有說明。", "範本 土地開發分析價格表備註");
    add("cost", B.cost > A.cost ? "warn" : "ok", `營造施工費：容移後 ${A.cost.toLocaleString()}／容移前 ${B.cost.toLocaleString()} 元/坪`, "樓層較低的建物，單位造價通常如何？", "營造單價設定方式應採相同邏輯；容移前樓層較低，造價不應高於容移後。", "例外：縮減後樓層落入次一級距時，得參酌該級距臨界值推估。", "範本 p.60 營造施工費設定原則");
    const dp = A.resPrice - B.resPrice, dc = A.cost - B.cost;
    add("price", dp < 0 ? "warn" : (dc > 0 && dp > dc * 1.5 ? "note" : "ok"), `住宅均價差 ${dp.toLocaleString()}／造價差 ${dc.toLocaleString()} 元/坪`, "均價為什麼不同？是樓層效用，還是把造價轉嫁給售價？", "比準戶單價原則上不因總樓層數差異而調整；均價差應來自新增高樓層之樓層別效用。", "把容移後新增樓層的效用比加權算一次。", "範本 比準戶原則；114 期末考第 8 題");
    add("result", r.dS > r.dDirect ? "ok" : "warn", `總銷增額 ${n(r.dS)}／總造價增額 ${n(r.dDirect)} 元`, "多蓋的那幾層，賣得的錢有沒有大於蓋的錢？", "檢核式：〔容移後總銷 − 容移前總銷〕＞〔容移後總造價 − 容移前總造價〕。", "不成立通常是售價或造價其中一邊設錯。", "審議原則自主檢核表「評估結果」");
    add("fee", r.fee <= 0 ? "warn" : "ok", `代金 ${n(r.fee)} 元`, "兩情境基地總價相減。", "代金＝含容積移入之基地價格 − 未含容積移入之基地價格，應為正值。", "負值先查利潤率、利率與造價三項是否在容移後被重複加碼。", "範本 基本公式");
    add("mkt", (r.mktRatio > 1.05 || r.mktRatio < 0.5) ? "note" : "ok", `代金市價比 ${f(r.mktRatio,4)}`, "代金容積單價 ÷ 容移後基地之容積單價。", "邊際容積的價值通常不高於平均容積單價。", "0.5 與 1.05 為教學門檻，非審議標準；偏離時用敏感度分析找原因。", "摘要表「容積代金與市價比例關係」");
    if (c.city === "ntpc") add("small", A.regArea < R.smallScalePing ? "note" : "ok", `容移後總登記面積 ${f(A.regArea,0)} 坪`, "量體有沒有達到營建經濟規模？", `小於 ${R.smallScalePing} 坪者，於容移前後一同加價（建議 10% 以上）並敘明。`, "加價要兩情境一起加。", "新北市 113 年注意事項 土開法重要原則(5)");
    return { r, checks: out };
  }

  const clone = o => JSON.parse(JSON.stringify(o));
  /* 待審案（教學用模擬，參數依 113 年修正版範本體例設計） */
  function flawCases(base) {
    const A = clone(base); A.name = "待審案 A（臺北市，模擬）"; A.city = "tpe";
    A.bef.floorsDown = 4; A.bef.digRate = 52; A.bef.R = 17; A.bef.adv = 5; A.bef.resPrice = 620000; A.legalPark = 40;
    const B = clone(base); B.name = "待審案 B（臺北市，模擬）"; B.city = "tpe";
    B.bef.bcr = 55; B.bef.cost = 170000; B.aft.R = 14; B.bef.digRate = 60;
    return { A, B };
  }
  const REVIEW_ITEMS = [
    ["ratio", "容移前後銷坪比不一致"], ["bcr", "實設建蔽率前後不一致"], ["dig", "容移前地下室開挖率或樓層調整不符原則"],
    ["park", "容移前車位數未滿足法定車位"], ["profit_a", "容移後利潤率與開發年期不對應"], ["profit_b", "容移前利潤率與開發年期不對應"],
    ["profit_gap", "容移後利潤率低於容移前"], ["ind_same", "間接成本費率前後不一致"], ["cost", "容移前營造單價高於容移後"],
    ["price", "住宅均價差距缺乏樓層效用支撐"], ["result", "總銷增額未大於總造價增額"], ["years", "開發年期前後邏輯不合"]
  ];
  window.CALC = { PING, RULES, scen, calc, check, profitBand, clone, flawCases, REVIEW_ITEMS };
})();
