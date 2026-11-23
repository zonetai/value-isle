/* 靜態匯出後處理（npm run build 會自動跑）。
   Next.js 16 匯出的換頁預載檔放在 out/daily/__next.daily/__PAGE__.txt 這種多一層的資料夾，
   瀏覽器實際要的是 out/daily/__next.daily.__PAGE__.txt。這裡把每個這種檔案多複製一份成瀏覽器要的名字，
   換頁預載才不會 404（不處理也能換頁，只是會退回整頁載入）。 */
import { copyFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const OUT = new URL("../out/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
let n = 0;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (!statSync(p).isDirectory()) continue;
    if (name.startsWith("__next.")) flatten(p, dir, name);
    else walk(p);
  }
}
/* __next.daily/__PAGE__.txt → __next.daily.__PAGE__.txt；更深的層級也一樣用「.」串起來 */
function flatten(dir, parent, prefix) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) flatten(p, parent, `${prefix}.${name}`);
    else { copyFileSync(p, join(parent, `${prefix}.${name}`)); n++; }
  }
}
walk(OUT);
console.log(`flatten-segments：補了 ${n} 個換頁預載檔`);
