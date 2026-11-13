import { G } from "@/components/Gloss";
import { LayerDaily, LayerItems, PageHero } from "@/components/LayerBlocks";
import { PolicyTimeline, type PolicyEvent } from "@/components/PolicyTimeline";
import { DATA } from "@/data/site";
import { DAILY } from "@/data/daily";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta("政策時間軸", "2020 年以來影響不動產價格的信用管制、稅制、交易限制與住宅政策，依時間排開，每一條附「對估價的影響」。", "/policy");

/** 由舊到新：既有政策事件 → 每日觀測裡最近 12 則政策快訊 → 尚未發生的追蹤事件 */
function buildEvents(): PolicyEvent[] {
  const P = DATA.policies as readonly PolicyEvent[];
  const recent: PolicyEvent[] = DAILY.briefs
    .filter((b) => b.layer === "policy").slice(0, 12).reverse()
    .map((b) => ({ when: b.d, cat: "近期動態", t: b.t, s: b.s, i: b.i ?? "", src: b.src, url: b.url }));
  return [...P.filter((p) => !p.future), ...recent, ...P.filter((p) => p.future)];
}

export default function PolicyPage() {
  return (
    <>
      <PageHero mark="gavel" title="政策時間軸" badge="第 1 層・一般因素" color="var(--c-policy)">
        把近年影響不動產價格的政策一字排開，2025 年起的事件來自估價師每月追蹤的一般因素分析。按「播放」讓事件依時間一個個亮起，每一條都附「對估價的影響」。不評論政策好壞，只說它怎麼改變價格形成的方式。
      </PageHero>
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container">
          <LayerDaily layer="policy" title="政策氣候的最新動態" />
          <div className="section-head" style={{ marginTop: 8 }}>
            <div><h2>政策時間軸</h2><p><G>{"最新的在最上面，往下回溯到 2020 年的信用管制。標「近期動態」的事件來自每日觀測，附原文連結；按播放會從最早的事件一路亮到最新。"}</G></p></div>
          </div>
          <PolicyTimeline events={buildEvents()} />
          <div className="section-head reveal" style={{ marginTop: 56 }}><div><h2>這一層的觀測項目</h2><p><G>{"除了時間軸上的事件，估價師在「政策氣候」這一層還持續盯著這些。"}</G></p></div></div>
          <LayerItems layer="policy" />
        </div>
      </section>
    </>
  );
}
