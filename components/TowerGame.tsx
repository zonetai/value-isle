"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "./Icon";

/* ============================================================
   /tower：蓋高樓的專屬網址。打開就直接進遊戲（不用先走進島上），
   玩完按「回到島上」回到價值島首頁。遊戲本體在 lib/stack-game.js。
   ============================================================ */
export function TowerGame() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const game = useRef<{ close: () => void } | null>(null);
  const start = async () => {
    if (game.current) return;
    const { startStackGame } = await import("@/lib/stack-game.js");
    setOpen(true);
    game.current = startStackGame({ onClose: () => { game.current = null; setOpen(false); router.push("/"); } });
  };
  useEffect(() => { start(); return () => game.current?.close(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="section tower-landing">
      <div className="container" style={{ maxWidth: 760 }}>
        <small className="tl-kick">價值島・小遊戲</small>
        <h1>蓋高樓</h1>
        <p>樓板在基地上方來回移動，看準時機點一下放下去。蓋到台灣與世界知名高樓的高度就能收進圖鑑：從透天厝、台北 101、哈里發塔，一路蓋到太空和宇宙的盡頭。</p>
        {!open && <button className="btn" onClick={start}><Icon name="play" />開始玩</button>}
        <p className="tl-back"><Link href="/">← 回到價值島</Link></p>
      </div>
    </section>
  );
}
