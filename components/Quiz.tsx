"use client";

import { useEffect, useState } from "react";
import { DATA } from "@/data/site";
import { KN } from "@/data/knowledge";
import { useSite } from "./SiteProvider";

type Q = { q: string; opts: string[]; a: number; exp: string; cat: string };
const ALL: Q[] = [...DATA.quiz.map((q) => ({ ...q, cat: "估價基礎" })), ...KN.quiz];
const CATS = ["全部", ...new Set(ALL.map((q) => q.cat))];
const KEY = "vi-quiz2";

/** 分類小測：答題紀錄（對／錯）存在瀏覽器；children 是右欄的辭典 */
export function Quiz({ children }: { children: React.ReactNode }) {
  const { toast } = useSite();
  const [cat, setCat] = useState("全部");
  const [qi, setQi] = useState(0);
  const [record, setRecord] = useState<Record<string, boolean>>({});
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    try { setRecord(JSON.parse(localStorage.getItem(KEY) || "{}")); } catch {}
  }, []);
  const save = (r: Record<string, boolean>) => { setRecord(r); try { localStorage.setItem(KEY, JSON.stringify(r)); } catch {} };

  const pool = ALL.filter((q) => cat === "全部" || q.cat === cat);
  const q = pool[Math.min(qi, pool.length - 1)];
  const answered = record[q.q] !== undefined;
  const score = pool.filter((x) => record[x.q] === true).length;
  const tried = pool.filter((x) => record[x.q] !== undefined).length;
  const last = qi === pool.length - 1;

  const answer = (i: number) => {
    if (answered) return;
    setPicked(i);
    save({ ...record, [q.q]: i === q.a });
    if (i === q.a) toast("答對了");
  };
  const go = (n: number) => { setQi(n); setPicked(null); };
  const next = () => {
    if (!last) return go(qi + 1);
    const r = { ...record }; pool.forEach((x) => delete r[x.q]); save(r); go(0);
  };
  const optClass = (i: number) => {
    if (!answered) return undefined;
    if (i === q.a) return "right";
    if (i === picked) return "wrong";
    return undefined;
  };

  return (
    <>
      <div className="note-filters" id="cats">
        {CATS.map((c) => (
          <button key={c} className={c === cat ? "chip on" : "chip"} onClick={() => { setCat(c); go(0); }}>
            {c}<small style={{ marginLeft: 4, color: "var(--ink-3)" }}>{c === "全部" ? ALL.length : ALL.filter((x) => x.cat === c).length}</small>
          </button>
        ))}
      </div>
      <div className="quiz">
        <div className="card q-card" id="quizCard">
          <div className="q-inner" key={q.q}>
            <span className="qn">{q.cat} · 第 {qi + 1} 題，共 {pool.length} 題</span>
            <h3>{q.q}</h3>
            <div className="q-opts">
              {q.opts.map((o, i) => <button key={o} className={optClass(i)} onClick={() => answer(i)}>{o}</button>)}
            </div>
            <div className={answered ? "q-exp show" : "q-exp"}>{q.exp}</div>
            <div className="q-foot">
              <div>
                <span className="score">答對 {score} / 已答 {tried}</span>
                <div className="score-ring">
                  {pool.map((x) => <i key={x.q} className={record[x.q] === true ? "ok" : record[x.q] === false ? "no" : undefined} />)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn ghost sm" disabled={qi === 0} onClick={() => go(qi - 1)} aria-label="上一題">←</button>
                <button className="btn ghost sm" onClick={next}>{last ? "重新開始" : "下一題"}</button>
              </div>
            </div>
          </div>
        </div>
        {children}
      </div>
    </>
  );
}
