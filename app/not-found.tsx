import Link from "next/link";
import { DATA } from "@/data/site";

export default function NotFound() {
  return (
    <section className="page-hero" style={{ minHeight: "50vh" }}>
      <div className="container">
        <h1>這一頁不在島上</h1>
        <p>網址可能打錯了，或這一頁已經搬家。可以從這裡回到島上：</p>
        <div className="cta" style={{ marginTop: 18 }}>
          {DATA.pages.map((p) => <Link key={p.href} className="chip" href={p.href}>{p.label}</Link>)}
        </div>
      </div>
    </section>
  );
}
