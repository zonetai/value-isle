import { PageHero } from "@/components/LayerBlocks";
import { RoleExplorer } from "@/components/RoleExplorer";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta("我是誰", "準買方、屋主、銀行、建商、都更地主、法院，以及估價師、律師、會計師、地政士、經紀人員、租賃業者：不同身分看不動產價格的順序。", "/roles");

export default function RolesPage() {
  return (
    <>
      <PageHero title="我是誰">
        不同身分，關心的層次不一樣。選一個身分，島上會亮起需要先盯的那幾層，並列出看價的順序。上面是一般委託人，下面是在工作上會碰到不動產價格的專業人士。
      </PageHero>
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container">
          <RoleExplorer />
        </div>
      </section>
    </>
  );
}
