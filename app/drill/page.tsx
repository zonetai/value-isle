import { PageHero } from "@/components/LayerBlocks";
import { Quiz } from "@/components/Quiz";
import { DATA } from "@/data/site";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta("估價小測＋估價師辭典", "題目來自估價師的審查、都更審議與買房諮詢經驗，分主題練估價直覺，旁邊是常被問到的不動產估價名詞解釋。", "/drill");

export default function DrillPage() {
  return (
    <>
      <PageHero title="估價小測 ＋ 估價師辭典">
        題目來自估價師的審查、都更審議與買房諮詢經驗。選一個主題練直覺，旁邊是常被問到的名詞。答題紀錄會留在你的瀏覽器裡。
      </PageHero>
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container">
          <Quiz>
            <div>
              <div className="section-head" style={{ marginBottom: 14 }}><div><h2 style={{ fontSize: "1.3rem" }}>估價師辭典</h2></div></div>
              <div className="glossary" id="glossary">
                {DATA.glossary.map((g) => (
                  <details key={g.t}><summary>{g.t}</summary><p>{g.d}</p></details>
                ))}
              </div>
            </div>
          </Quiz>
        </div>
      </section>
    </>
  );
}
