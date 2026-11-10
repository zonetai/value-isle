/* 每日觀測資料檢查：npm run check:daily（Node 22 以上）
   每日排程推送前一定要跑；有錯就回傳 1，排程不得推送。 */
import { readFileSync } from "node:fs";
import { DAILY } from "../data/daily.ts";

const errors: string[] = [];
const warns: string[] = [];
const LAYERS = ["intl", "policy", "market", "ind"];
const isDate = (s: unknown) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

if (!isDate(DAILY.updated)) errors.push(`updated 不是 YYYY-MM-DD：${DAILY.updated}`);
if (DAILY.briefs.length > 60) errors.push(`briefs 有 ${DAILY.briefs.length} 則，超過 60 則上限`);

const cutoff = new Date(Date.parse(DAILY.updated) - 45 * 86400e3).toISOString().slice(0, 10);
const seen = new Set<string>();
DAILY.briefs.forEach((b, i) => {
  const at = `briefs[${i}]「${(b.t || "").slice(0, 20)}」`;
  for (const k of ["d", "layer", "t", "s", "src", "url"] as const) if (!b[k]) errors.push(`${at} 缺少 ${k}`);
  if (b.d && !isDate(b.d)) errors.push(`${at} 日期格式錯誤：${b.d}`);
  if (b.layer && !LAYERS.includes(b.layer)) errors.push(`${at} layer 只能是 ${LAYERS.join("／")}：${b.layer}`);
  if (b.url && !/^https?:\/\//.test(b.url)) errors.push(`${at} 網址要以 http 開頭：${b.url}`);
  if (b.d && b.d > DAILY.updated) errors.push(`${at} 日期 ${b.d} 晚於 updated ${DAILY.updated}`);
  if (b.d && b.d < cutoff) warns.push(`${at} 日期 ${b.d} 早於 45 天前（${cutoff}），應刪除`);
  if (i > 0 && b.d > DAILY.briefs[i - 1].d) warns.push(`${at} 沒有依日期由新到舊排列`);
  if (b.t && b.t.length > 30) warns.push(`${at} 標題 ${b.t.length} 字，建議 24 字內`);
  const key = (b.url || "") + "|" + b.t;
  if (seen.has(key)) errors.push(`${at} 重複`);
  seen.add(key);
});
DAILY.topics.forEach((t, i) => {
  if (!t.id || !t.title || !t.layer) errors.push(`topics[${i}] 缺少 id、title 或 layer`);
  if (t.layer && !LAYERS.includes(t.layer)) errors.push(`topics[${i}] layer 錯誤：${t.layer}`);
});

/* 用詞禁忌：全站不使用「洋流」；不用破折號「——」 */
const text = readFileSync(new URL("../data/daily.ts", import.meta.url), "utf8");
if (text.includes("洋流")) errors.push("出現禁用詞「洋流」（國際這一層一律稱「國際海象」）");
if (text.includes("——")) warns.push("出現破折號「——」");

const per = Object.fromEntries(LAYERS.map((l) => [l, DAILY.briefs.filter((b) => b.layer === l).length]));
console.log(`updated ${DAILY.updated}｜${DAILY.briefs.length} 則快訊（國際 ${per.intl}、政策 ${per.policy}、市場 ${per.market}、個案 ${per.ind}）｜${DAILY.topics.length} 個專題`);
warns.forEach((w) => console.log("提醒：" + w));
if (errors.length) {
  errors.forEach((e) => console.error("錯誤：" + e));
  process.exit(1);
}
console.log("檢查通過");
