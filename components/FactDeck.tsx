"use client";

import { useEffect, useState } from "react";
import { DATA } from "@/data/site";
import { KN } from "@/data/knowledge";
import { Icon } from "./Icon";

const FACTS = [...DATA.facts, ...KN.facts];

/** 估價小卡：一次一句，點文字或按「換一張」隨機換下一張。伺服器端先畫第一張，載入後從隨機一張開始 */
export function FactDeck() {
  const [fi, setFi] = useState(0);
  const [count, setCount] = useState(1);
  const [flip, setFlip] = useState(0);
  useEffect(() => { setFi(Math.floor(Math.random() * FACTS.length)); }, []);
  const next = () => {
    setFi((i) => (i + 1 + Math.floor(Math.random() * (FACTS.length - 1))) % FACTS.length);
    setCount((c) => c + 1);
    setFlip((f) => f + 1);
  };
  return (
    <div className="factdeck reveal" id="factDeck">
      <div className="fd-side"><span className="kicker">估價小卡</span><small>第 {count} 張 ／ 共 {FACTS.length} 張</small></div>
      <p key={flip} className={flip ? "fd-text flip" : "fd-text"} onClick={next}>{FACTS[fi]}</p>
      <button className="btn ghost sm" onClick={next}><Icon name="shuffle" />換一張</button>
    </div>
  );
}
