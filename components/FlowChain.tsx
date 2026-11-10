import { Fragment } from "react";

/** 「國際海象 → 資金成本 → … → 價格」傳導鏈（span 與 i 要是同一層的兄弟，樣式的 nth-child 延遲才對得上） */
export function FlowChain() {
  const steps = ["國際海象", "資金成本", "政策氣候", "市場潮位", "個別條件"];
  return (
    <div className="flow">
      {steps.map((s) => (
        <Fragment key={s}><span>{s}</span><i>→</i></Fragment>
      ))}
      <span><b>價格</b></span>
    </div>
  );
}
