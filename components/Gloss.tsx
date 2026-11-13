import { Fragment } from "react";
import { DATA } from "@/data/site";

/* ============================================================
   名詞小註：內文裡的估價名詞（data/site.ts 的 glossary）加虛線，滑過或點一下看白話解釋。
   舊版是畫面出來後再改文字節點；這裡改成產生文字時就標好（伺服器端就有），
   每段文字裡每個名詞只標第一次出現的地方。解釋框在 GlossPop。
   ============================================================ */
type Entry = { i: number; keys: string[] };
export const GLOSS: Entry[] = DATA.glossary.map((g, i) => ({
  i,
  // 「一般 / 區域 / 個別因素」這種寫法拆成「一般因素」「區域因素」「個別因素」；有 k 就用 k
  keys: "k" in g && Array.isArray(g.k)
    ? (g.k as string[])
    : g.t.split(" / ").map((p) => (/因素$/.test(g.t) && !/因素$/.test(p) ? p + "因素" : p)),
}));

/** 把一段文字裡的辭典名詞包成 <span class="gl">；不是字串就原樣傳回 */
export function G({ children }: { children?: React.ReactNode }) {
  if (typeof children !== "string" || children.length < 3) return <>{children}</>;
  const text = children;
  const out: React.ReactNode[] = [];
  const used = new Set<number>();
  let at = 0;
  for (;;) {
    let best: { pos: number; key: string; i: number } | null = null;
    for (const e of GLOSS) {
      if (used.has(e.i)) continue;
      for (const key of e.keys) {
        const pos = text.indexOf(key, at);
        if (pos >= 0 && (!best || pos < best.pos || (pos === best.pos && key.length > best.key.length))) best = { pos, key, i: e.i };
      }
    }
    if (!best) break;
    if (best.pos > at) out.push(text.slice(at, best.pos));
    out.push(<span key={best.pos} className="gl" data-g={best.i} tabIndex={0}>{best.key}</span>);
    used.add(best.i);
    at = best.pos + best.key.length;
  }
  if (!out.length) return <>{text}</>;
  if (at < text.length) out.push(text.slice(at));
  return <>{out.map((x, k) => <Fragment key={k}>{x}</Fragment>)}</>;
}
