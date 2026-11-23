import { PageHero } from "@/components/LayerBlocks";
import { NotesList } from "@/components/NotesList";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta("估價師手記", "估價師歷年寫過的專欄、投書、期刊文章與專訪摘要，從一件經手的案子或一則新聞起手，用估價的方法拆開來看。", "/notes");

export default function NotesPage() {
  return (
    <>
      <PageHero mark="deed" title="估價師手記">
        估價師歷年寫過的專欄、投書、期刊文章與專訪摘要，由新到舊排列。每一篇都從一件經手的案子或一則新聞起手，用估價的方法拆開來看。點卡片展開三個重點；想看全文請洽原刊物。較早的文章談到的制度，部分已經修法，卡片上會註明。
      </PageHero>
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container">
          <NotesList />
        </div>
      </section>
    </>
  );
}
